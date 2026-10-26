#!/bin/bash
set -euo pipefail

if [ -z "${TEAMS_WEBHOOK_URL:-}" ]; then
  echo "❌ TEAMS_WEBHOOK_URL nao configurado!"
  exit 1
fi

MAPPING_FILE="${MAPPING_FILE:-.github/team-mapping.json}"

if [ ! -f "$MAPPING_FILE" ]; then
  echo "⚠️ Arquivo de mapeamento não encontrado: $MAPPING_FILE. Menções não funcionarão."
  MAPPING_FILE="/dev/null"
fi

# Tempo limite em minutos (4 horas sem atividade = alerta)
STALE_MINUTES=240

# Minimo de reviews para considerar PR "avaliada" (para de alertar)
MIN_REVIEWS=2

echo "🔍 Buscando PRs abertas há mais de ${STALE_MINUTES} minutos sem atividade..."

# Buscar PRs abertas do repositório (mergeadas/fechadas já são excluídas)
PRS=$(gh pr list --state open --json number,title,url,author,reviewRequests,updatedAt,headRefName --limit 50)

if [ -z "$PRS" ] || [ "$PRS" == "[]" ]; then
  echo "✅ Nenhuma PR aberta encontrada."
  exit 0
fi

NOW=$(date -u +%s)
NOTIFIED=0

while read -r pr; do
  PR_NUMBER=$(echo "$pr" | jq -r '.number')
  PR_TITLE=$(echo "$pr" | jq -r '.title')
  PR_URL=$(echo "$pr" | jq -r '.url')
  PR_AUTHOR=$(echo "$pr" | jq -r '.author.login')
  PR_BRANCH=$(echo "$pr" | jq -r '.headRefName')
  UPDATED_AT=$(echo "$pr" | jq -r '.updatedAt')

  # Calcular tempo desde ultima atualizacao
  UPDATED_EPOCH=$(date -u -d "$UPDATED_AT" +%s 2>/dev/null || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$UPDATED_AT" +%s 2>/dev/null || echo "0")

  if [ "$UPDATED_EPOCH" == "0" ]; then
    echo "⚠️ Nao foi possivel parsear data da PR #$PR_NUMBER, pulando..."
    continue
  fi

  DIFF_SECONDS=$((NOW - UPDATED_EPOCH))
  DIFF_MINUTES=$((DIFF_SECONDS / 60))

  if [ "$DIFF_MINUTES" -lt "$STALE_MINUTES" ]; then
    continue
  fi

  echo "⏰ PR #$PR_NUMBER parada há ${DIFF_MINUTES} minutos: $PR_TITLE"

  # Verificar quantas pessoas já avaliaram
  REVIEW_COUNT=$(gh pr view "$PR_NUMBER" --json reviews --jq '[.reviews[].author.login] | unique | length' 2>/dev/null || echo "0")

  if [ "$REVIEW_COUNT" -ge "$MIN_REVIEWS" ]; then
    echo "✅ PR #$PR_NUMBER já tem ${REVIEW_COUNT} avaliações, pulando..."
    continue
  fi

  echo "📋 PR #$PR_NUMBER tem ${REVIEW_COUNT}/${MIN_REVIEWS} avaliações necessárias"

  # Resolver revisores
  REVIEWERS=$(echo "$pr" | jq -r '.reviewRequests[].login // empty' 2>/dev/null || true)

  # Resolver mencoes
  ALL_LOGINS="$PR_AUTHOR"
  if [ -n "$REVIEWERS" ]; then
    ALL_LOGINS="$ALL_LOGINS $REVIEWERS"
  fi

  # Construir texto de revisores com mencao
  REVIEWER_MENTIONS=""
  for reviewer in $REVIEWERS; do
    NAME=$(jq -r --arg l "$reviewer" '.members[] | select(.login == $l) | .name // empty' "$MAPPING_FILE" 2>/dev/null || true)
    if [ -n "$NAME" ]; then
      MENTION="<at>$NAME</at>"
    else
      MENTION="@$reviewer"
    fi
    if [ -n "$REVIEWER_MENTIONS" ]; then
      REVIEWER_MENTIONS="$REVIEWER_MENTIONS, $MENTION"
    else
      REVIEWER_MENTIONS="$MENTION"
    fi
  done

  # Autor com mencao
  AUTHOR_NAME=$(jq -r --arg l "$PR_AUTHOR" '.members[] | select(.login == $l) | .name // empty' "$MAPPING_FILE" 2>/dev/null || true)
  if [ -n "$AUTHOR_NAME" ]; then
    AUTHOR_MENTION="<at>$AUTHOR_NAME</at>"
  else
    AUTHOR_MENTION="@$PR_AUTHOR"
  fi

  # Texto de quem precisa agir
  if [ -n "$REVIEWER_MENTIONS" ]; then
    ACTION_TEXT="👋 Olá $REVIEWER_MENTIONS! Essa PR está aguardando revisão há algum tempo. Quando possível, poderia dar uma olhada?"
  else
    ACTION_TEXT="👋 Olá $AUTHOR_MENTION! Essa PR está parada há algum tempo. Precisa de ajuda ou de um revisor?"
  fi

  # Calcular tempo legível
  if [ "$DIFF_MINUTES" -ge 1440 ]; then
    DIFF_DAYS=$((DIFF_MINUTES / 1440))
    TIME_TEXT="${DIFF_DAYS} dia(s)"
  elif [ "$DIFF_MINUTES" -ge 60 ]; then
    DIFF_HOURS=$((DIFF_MINUTES / 60))
    TIME_TEXT="${DIFF_HOURS} hora(s)"
  else
    TIME_TEXT="${DIFF_MINUTES} minuto(s)"
  fi

  # Montar entities para mencoes Teams
  ENTITIES="[]"
  for login in $ALL_LOGINS; do
    NAME=$(jq -r --arg l "$login" '.members[] | select(.login == $l) | .name // empty' "$MAPPING_FILE" 2>/dev/null || true)
    EMAIL=$(jq -r --arg l "$login" '.members[] | select(.login == $l) | .email // empty' "$MAPPING_FILE" 2>/dev/null || true)
    if [ -n "$NAME" ] && [ -n "$EMAIL" ]; then
      ENTITIES=$(echo "$ENTITIES" | jq \
        --arg name "$NAME" \
        --arg email "$EMAIL" \
        '. + [{
          "type": "mention",
          "text": ("<at>" + $name + "</at>"),
          "mentioned": {
            "id": $email,
            "name": $name
          }
        }]')
    fi
  done

  # Construir Adaptive Card
  PAYLOAD=$(jq -n \
    --arg title "$PR_TITLE" \
    --arg url "$PR_URL" \
    --arg branch "$PR_BRANCH" \
    --arg time "$TIME_TEXT" \
    --arg action "$ACTION_TEXT" \
    --arg author "$AUTHOR_MENTION" \
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
            "body": [
              {
                "type": "TextBlock",
                "size": "Large",
                "weight": "Bolder",
                "text": "⏳ Lembrete de PR",
                "color": "Warning"
              },
              {
                "type": "TextBlock",
                "text": ("Essa PR está parada há **" + $time + "**. Poderia verificar, por favor?"),
                "wrap": true
              },
              {
                "type": "FactSet",
                "facts": [
                  { "title": "📌 PR:", "value": $title },
                  { "title": "📂 Branch:", "value": $branch },
                  { "title": "🔗 Link:", "value": $url },
                  { "title": "✍️ Autor:", "value": $author },
                  { "title": "⏱️ Parada há:", "value": $time }
                ]
              },
              {
                "type": "TextBlock",
                "text": $action,
                "wrap": true,
                "spacing": "Medium"
              }
            ],
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

  # Enviar notificacao
  HTTP_CODE=$(curl -s -o /tmp/response.txt -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$TEAMS_WEBHOOK_URL")

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "✅ Lembrete enviado para PR #$PR_NUMBER"
    NOTIFIED=$((NOTIFIED + 1))
  else
    echo "❌ Falha ao enviar lembrete para PR #$PR_NUMBER (HTTP: $HTTP_CODE)"
    cat /tmp/response.txt
  fi

done < <(echo "$PRS" | jq -c '.[]')

echo "📊 Total de lembretes enviados: $NOTIFIED"
