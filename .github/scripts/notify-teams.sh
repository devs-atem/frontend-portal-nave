#!/bin/bash
set -euo pipefail

if [ -z "${TEAMS_WEBHOOK_URL:-}" ]; then
  echo "❌ TEAMS_WEBHOOK_URL nao configurado!"
  exit 1
fi

if [ -z "${PR_AUTHOR:-}" ]; then
  echo "❌ PR_AUTHOR nao configurado!"
  exit 1
fi

MAPPING_FILE="${MAPPING_FILE:-.github/team-mapping.json}"

if [ ! -f "$MAPPING_FILE" ]; then
  echo "⚠️ Arquivo de mapeamento '$MAPPING_FILE' não encontrado. Menções usarão fallback @login."
fi

# ============================================================
# Mapa login -> índice de menção (0-based)
#
# O Microsoft Teams só renderiza menções clicáveis (que "pingam" a pessoa)
# quando o texto do corpo usa um token index-based <at>i</at> que casa com
# exatamente UMA entity em msteams.entities cujo .text também é <at>i</at>.
# Tokens baseados em nome (<at>Nome</at>) NÃO linkam e ainda duplicam quando
# duas pessoas têm o mesmo nome de exibição.
#
# O índice é derivado do universo COMPLETO de logins envolvidos na notificação
# (autor + revisores solicitados + revisores que já revisaram + revisores de
# time), deduplicado e ordenado de forma estável (sort -u). Assim o índice de
# cada login é determinístico e idêntico ao usado na montagem das entities.
# ============================================================

# Universo de logins candidatos a menção (mesma base usada em ENTITIES).
MENTION_UNIVERSE="${PR_AUTHOR:-}"
[ -n "${REVIEWERS:-}" ]       && MENTION_UNIVERSE="$MENTION_UNIVERSE ${REVIEWERS}"
[ -n "${REVIEWED_LOGINS:-}" ] && MENTION_UNIVERSE="$MENTION_UNIVERSE ${REVIEWED_LOGINS}"
[ -n "${REQUESTED_LOGINS:-}" ] && MENTION_UNIVERSE="$MENTION_UNIVERSE ${REQUESTED_LOGINS}"

# Revisores vindos de teams (resolvidos a partir do MAPPING_FILE) também
# precisam de índice; são incluídos no universo aqui.
if [ -n "${REQUESTED_TEAMS:-}" ] && [ "$REQUESTED_TEAMS" != "[]" ]; then
  for _team in $(echo "$REQUESTED_TEAMS" | jq -r '.[]' 2>/dev/null); do
    for _login in $(jq -r --arg t "$_team" '.teams[] | select(.slug == $t) | .members[].login' "$MAPPING_FILE" 2>/dev/null); do
      MENTION_UNIVERSE="$MENTION_UNIVERSE $_login"
    done
  done
fi

# Lista determinística (dedup + ordenada) de logins que efetivamente recebem
# menção — apenas os que têm name E email no mapping (bug-condition logins).
MENTIONABLE_LOGINS=""
for _login in $(echo "$MENTION_UNIVERSE" | tr ' ' '\n' | grep -v '^$' | sort -u); do
  _n=$(jq -r --arg l "$_login" '.members[] | select(.login == $l) | .name // empty' "$MAPPING_FILE" 2>/dev/null || true)
  _e=$(jq -r --arg l "$_login" '.members[] | select(.login == $l) | .email // empty' "$MAPPING_FILE" 2>/dev/null || true)
  if [ -n "$_n" ] && [ -n "$_e" ]; then
    MENTIONABLE_LOGINS="${MENTIONABLE_LOGINS:+$MENTIONABLE_LOGINS }$_login"
  fi
done

# mention_index <login> : imprime o índice 0-based do login na lista
# determinística de logins mencionáveis, ou vazio se não for mencionável.
mention_index() {
  local target="$1" i=0 l
  for l in $MENTIONABLE_LOGINS; do
    if [ "$l" = "$target" ]; then
      printf '%s' "$i"
      return 0
    fi
    i=$((i + 1))
  done
  return 1
}

# Resolve github login para texto de mencao Teams.
# Retorna <at>i</at> (token index-based) APENAS quando o login tem name E email
# no mapping — é a única forma do Teams linkar a menção de forma clicável.
# Fallback: nome por extenso (sem <at>) se tem name mas não email; @login se não tem nenhum.
resolve_mention() {
  local login="$1"
  local name email idx
  name=$(jq -r --arg l "$login" '.members[] | select(.login == $l) | .name // empty' "$MAPPING_FILE" 2>/dev/null || true)
  email=$(jq -r --arg l "$login" '.members[] | select(.login == $l) | .email // empty' "$MAPPING_FILE" 2>/dev/null || true)

  if [ -n "$name" ] && [ -n "$email" ]; then
    # Menção real: token index-based <at>i</at> será linkado via msteams.entities
    idx=$(mention_index "$login" || true)
    if [ -n "$idx" ]; then
      printf '<at>%s</at>' "$idx"
    else
      # Não deveria acontecer (login mencionável sempre tem índice); fallback seguro
      printf '<at>%s</at>' "$name"
    fi
  elif [ -n "$name" ]; then
    # Nome conhecido mas sem email — exibe nome puro (legível, sem <at> órfão)
    echo "⚠️ [notify-teams] login '$login' tem nome mas sem email no mapping — exibindo nome sem link de menção" >&2
    printf '%s' "$name"
  else
    # Login desconhecido — fallback @login
    echo "⚠️ [notify-teams] login '$login' não encontrado no mapping — usando fallback @login" >&2
    printf '@%s' "$login"
  fi
}

# Resolver autor
AUTHOR_MENTION=$(resolve_mention "$PR_AUTHOR")

# Resolver revisores
REVIEWER_MENTIONS=""
if [ -n "${REVIEWERS:-}" ]; then
  for reviewer in $REVIEWERS; do
    MENTION=$(resolve_mention "$reviewer")
    if [ -n "$REVIEWER_MENTIONS" ]; then
      REVIEWER_MENTIONS="$REVIEWER_MENTIONS, $MENTION"
    else
      REVIEWER_MENTIONS="$MENTION"
    fi
  done
fi

# Fallback: se REVIEWERS está vazio (ex: PR mergeada), usa REVIEWED_LOGINS
if [ -z "$REVIEWER_MENTIONS" ] && [ -n "${REVIEWED_LOGINS:-}" ]; then
  for reviewer in $REVIEWED_LOGINS; do
    MENTION=$(resolve_mention "$reviewer")
    if [ -n "$REVIEWER_MENTIONS" ]; then
      REVIEWER_MENTIONS="$REVIEWER_MENTIONS, $MENTION"
    else
      REVIEWER_MENTIONS="$MENTION"
    fi
  done
fi

# Revisores que vieram de teams (resolve membros a partir do MAPPING_FILE)
TEAM_REVIEWER_LOGINS=""
if [ -n "${REQUESTED_TEAMS:-}" ] && [ "$REQUESTED_TEAMS" != "[]" ]; then
  for team in $(echo "$REQUESTED_TEAMS" | jq -r '.[]' 2>/dev/null); do
    for login in $(jq -r --arg t "$team" '.teams[] | select(.slug == $t) | .members[].login' "$MAPPING_FILE" 2>/dev/null); do
      if [ "$login" == "$PR_AUTHOR" ]; then
        continue
      fi
      if ! echo " ${REVIEWED_LOGINS:-} ${REQUESTED_LOGINS:-} ${TEAM_REVIEWER_LOGINS:-} " | grep -qw "$login"; then
        TEAM_REVIEWER_LOGINS="${TEAM_REVIEWER_LOGINS:+$TEAM_REVIEWER_LOGINS }$login"
      fi
    done
  done
fi

# Construir lista de revisores com status inline (✅ revisou, ⏳ pendente)
REVIEWER_INLINE=""
NEXT_PENDING_MENTION=""
if [ -n "${REVIEWED_LOGINS:-}" ] || [ -n "${REQUESTED_LOGINS:-}" ] || [ -n "${TEAM_REVIEWER_LOGINS:-}" ]; then
  # Revisores que já revisaram
  for login in ${REVIEWED_LOGINS:-}; do
    MENTION=$(resolve_mention "$login")
    if [ -n "$REVIEWER_INLINE" ]; then
      REVIEWER_INLINE="$REVIEWER_INLINE, ✅ $MENTION"
    else
      REVIEWER_INLINE="✅ $MENTION"
    fi
  done
  # Revisores pendentes (o primeiro da fila será cobrado educadamente)
  for login in ${REQUESTED_LOGINS:-}; do
    MENTION=$(resolve_mention "$login")
    if [ -z "$NEXT_PENDING_MENTION" ]; then
      NEXT_PENDING_MENTION="$MENTION"
    fi
    if [ -n "$REVIEWER_INLINE" ]; then
      REVIEWER_INLINE="$REVIEWER_INLINE, ⏳ $MENTION"
    else
      REVIEWER_INLINE="⏳ $MENTION"
    fi
  done
  # Revisores que vieram de teams (pendentes)
  for login in ${TEAM_REVIEWER_LOGINS:-}; do
    MENTION=$(resolve_mention "$login")
    if [ -z "$NEXT_PENDING_MENTION" ]; then
      NEXT_PENDING_MENTION="$MENTION"
    fi
    if [ -n "$REVIEWER_INLINE" ]; then
      REVIEWER_INLINE="$REVIEWER_INLINE, ⏳ $MENTION"
    else
      REVIEWER_INLINE="⏳ $MENTION"
    fi
  done
fi

# Mensagem educada cobrando o próximo revisor quando alguém APROVOU a PR
# Só exibe se ainda houver revisores pendentes na fila (NEXT_PENDING_MENTION não vazio)
NEXT_REVIEWER_NUDGE=""
PENDING_COUNT=0
for _ in ${REQUESTED_LOGINS:-}; do
  PENDING_COUNT=$((PENDING_COUNT + 1))
done

IS_MERGED="${IS_MERGED:-false}"
if [ "$IS_MERGED" != "true" ] && [ -n "${APPROVED_LOGINS:-}" ] && [ "$PENDING_COUNT" -gt 0 ] && [ -n "$NEXT_PENDING_MENTION" ]; then
  NEXT_REVIEWER_NUDGE="👋 $NEXT_PENDING_MENTION, você é o próximo da fila! Quando puder, dá uma olhada nessa PR? 🙏"
fi

# Textos separados para autor e revisores
AUTHOR_TEXT="✍️ Autor: $AUTHOR_MENTION"
if [ -n "$REVIEWER_INLINE" ]; then
  REVIEWERS_TEXT="👥 Par responsável: $REVIEWER_INLINE"
elif [ -n "$REVIEWER_MENTIONS" ]; then
  REVIEWERS_TEXT="👥 Par responsável: $REVIEWER_MENTIONS"
else
  REVIEWERS_TEXT="👥 Par responsável: (nenhum atribuído)"
fi

# Montar array de entities (mencoes Teams)
ALL_LOGINS="$PR_AUTHOR"
if [ -n "${REVIEWERS:-}" ]; then
  ALL_LOGINS="$ALL_LOGINS $REVIEWERS"
fi
if [ -n "${REVIEWED_LOGINS:-}" ]; then
  ALL_LOGINS="$ALL_LOGINS $REVIEWED_LOGINS"
fi
if [ -n "${REQUESTED_LOGINS:-}" ]; then
  ALL_LOGINS="$ALL_LOGINS $REQUESTED_LOGINS"
fi
if [ -n "${TEAM_REVIEWER_LOGINS:-}" ]; then
  ALL_LOGINS="$ALL_LOGINS $TEAM_REVIEWER_LOGINS"
fi
# Deduplica logins
ALL_LOGINS=$(echo "$ALL_LOGINS" | tr ' ' '\n' | sort -u | tr '\n' ' ')

ENTITIES="[]"
for login in $ALL_LOGINS; do
  NAME=$(jq -r --arg l "$login" '.members[] | select(.login == $l) | .name // empty' "$MAPPING_FILE" 2>/dev/null || true)
  EMAIL=$(jq -r --arg l "$login" '.members[] | select(.login == $l) | .email // empty' "$MAPPING_FILE" 2>/dev/null || true)
  if [ -n "$NAME" ] && [ -n "$EMAIL" ]; then
    IDX=$(mention_index "$login" || true)
    if [ -z "$IDX" ]; then
      echo "⚠️ [notify-teams] login '$login' mencionável mas sem índice — pulando entity" >&2
      continue
    fi
    echo "✅ [notify-teams] entity adicionado: login='$login' idx='$IDX' name='$NAME' email='$EMAIL'" >&2
    ENTITIES=$(echo "$ENTITIES" | jq \
      --arg idx "$IDX" \
      --arg name "$NAME" \
      --arg email "$EMAIL" \
      '. + [{
        "type": "mention",
        "text": ("<at>" + $idx + "</at>"),
        "mentioned": {
          "id": $email,
          "name": $name
        }
      }]')
  elif [ -n "$NAME" ]; then
    echo "⚠️ [notify-teams] entity IGNORADO para '$login': tem nome mas falta email no TEAM_USERS_MAPPING" >&2
  else
    echo "⚠️ [notify-teams] entity IGNORADO para '$login': login não encontrado no TEAM_USERS_MAPPING" >&2
  fi
done

# ============================================================
# Montar texto de teams atribuídos (só o nome do time)
# ============================================================
TEAMS_TEXT=""
if [ -n "${REQUESTED_TEAMS:-}" ] && [ "$REQUESTED_TEAMS" != "[]" ]; then
  for team in $(echo "$REQUESTED_TEAMS" | jq -r '.[]' 2>/dev/null); do
    TEAM_NAME=$(jq -r --arg t "$team" '.teams[] | select(.slug == $t) | .name // $t' "$MAPPING_FILE" 2>/dev/null || echo "$team")
    if [ -n "$TEAMS_TEXT" ]; then
      TEAMS_TEXT="$TEAMS_TEXT, $TEAM_NAME"
    else
      TEAMS_TEXT="$TEAM_NAME"
    fi
  done
  TEAMS_TEXT="🏷️ Time: $TEAMS_TEXT"
fi

# Truncar body (apenas 4 primeiras linhas de texto puro, sem markdown)
PR_BODY_TRUNCATED=$(printf '%s' "${PR_BODY:-}" | sed 's/^#\+\s*//g' | grep -v '^\s*$' | grep -v '^\[' | grep -v '^-' | grep -v '^\*' | grep -v '^|' | grep -v '<!--' | head -4 | tr '\n' ' ' | sed 's/#//g' | head -c 200)

# Definir titulo do card baseado no evento
CARD_TITLE="${NOTIFICATION_TITLE:-Abertura de PR}"

# Construir Adaptive Card com mencoes
PAYLOAD=$(jq -n \
  --arg repo "${REPO_NAME:-}" \
  --arg branch "${PR_BRANCH:-}" \
  --arg title "${PR_TITLE:-}" \
  --arg url "${PR_URL:-}" \
  --arg body "$PR_BODY_TRUNCATED" \
  --arg author "$AUTHOR_TEXT" \
  --arg reviewers "$REVIEWERS_TEXT" \
  --arg teamsText "$TEAMS_TEXT" \
  --arg cardTitle "$CARD_TITLE" \
  --arg nudge "$NEXT_REVIEWER_NUDGE" \
  --argjson entities "$ENTITIES" \
  '{
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": ([
            {
              "type": "TextBlock",
              "size": "Large",
              "weight": "Bolder",
              "text": $cardTitle
            },
            {
              "type": "TextBlock",
              "text": ("🔧 Projeto: " + $repo),
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": ("📂 Branch: " + $branch),
              "wrap": true,
              "spacing": "Small"
            },
            {
              "type": "TextBlock",
              "text": ("🔁 " + $url),
              "wrap": true,
              "spacing": "Small"
            },
            {
              "type": "TextBlock",
              "text": ("🧪 Resumo: " + $title),
              "wrap": true,
              "spacing": "Small"
            },
            {
              "type": "TextBlock",
              "text": $author,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "TextBlock",
              "text": $reviewers,
              "wrap": true,
              "spacing": "Small"
            }
          ] + (if $teamsText != "" then [{
              "type": "TextBlock",
              "text": $teamsText,
              "wrap": true,
              "spacing": "Small"
            }] else [] end) + (if $nudge != "" then [{
              "type": "TextBlock",
              "text": $nudge,
              "wrap": true,
              "spacing": "Medium",
              "color": "Accent"
            }] else [] end)),
          "msteams": {
            "entities": $entities
          },
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "Ver PR no GitHub",
              "url": $url
            }
          ]
        }
      }
    ]
  }')

echo "Enviando notificacao para o Teams..."

HTTP_CODE=$(curl -s -o /tmp/response.txt -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$TEAMS_WEBHOOK_URL")

echo "HTTP: $HTTP_CODE"
cat /tmp/response.txt

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "❌ Falha ao notificar Teams. HTTP: $HTTP_CODE"
  exit 1
fi

echo "✅ Notificacao enviada para o Teams"
