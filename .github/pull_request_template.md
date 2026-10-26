## 📝 Resumo

> Descreva em 2–3 frases **o que** este PR faz.

- ...


## 🤔 Por que isso foi feito?

> Contexto do problema, motivação e impacto esperado.
- Problema:
- Contexto adicional (link de documentação, incidentes, etc.):


## 🔗 Card(s) do Jira

> Liste os cards relacionados.

- `https://seu-jira-aqui` - Título do card


## ✅ O que foi alterado

> Breve visão geral das principais mudanças de código.
- [ ] Novos endpoints / serviços
- [ ] Mudança de comportamento existente
- [ ] Migração / script
- [ ] Refatoração
- [ ] Outro: ...


## 🔍 O que revisar? (pontos de atenção)

> Ajude o revisor a focar no que importa.

- Estrutura do projeto:  
  - [ ] O código segue o padrão/arquitetura do projeto?
- Complexidade:  
  - [ ] Funções e classes estão com complexidade razoável?
  - [ ] Há unidades lógicas pequenas e coesas (SRP)?
- Nomenclatura:  
  - [ ] Nomes de variáveis, funções, classes e arquivos estão claros?
- Logs & tracing:  
  - [ ] Existem logs suficientes para operações importantes?
  - [ ] Não há log excessivo/não necessário?
- Comentários:  
  - [ ] Trechos complexos estão bem comentados?
- Reversibilidade:  
  - [ ] A mudança é facilmente reversível (feature flag, rollback simples, etc.)?


## 🧪 Como testar

> Passo a passo para alguém conseguir validar seu PR.

1. Pré-requisitos:
   - ...
2. Passos para teste manual:
   - ...
3. Resultados esperados:
   - ...
4. Testes automatizados relevantes:
   - ...


## 📸 Evidências (prova de vida)

> Demonstre que o código funciona.

- [ ] Testes automatizados executados
  - Comando: `...`
  - Resultado: `...`
- [ ] Incluídos novos testes (unit / integration / e2e)
- [ ] Screenshots (se UI)
  - ![screenshot](url-ou-anexar)
- [ ] Vídeo explicativo (se complexo ou altera produção)
  - Link: ...


## ✅ Checklist antes de solicitar revisão (DEV)

- [ ] Rodei todos os testes relacionados e estão passando
- [ ] Revisei o código por conta própria antes de abrir o PR
- [ ] Removi códigos/commentários mortos ou temporários
- [ ] Mantida a consistência com o restante do projeto
- [ ] Atualizei documentação quando necessário
- [ ] Verifiquei impacto em produção e plano de rollback


## 👀 Checklist do revisor (opcional)

- [ ] Entendi o objetivo do PR
- [ ] Mudanças fazem sentido dentro da arquitetura do sistema
- [ ] Não há complexidade desnecessária
- [ ] Nomenclatura está clara e consistente
- [ ] Testes cobrem os cenários principais
- [ ] Plano de rollback é viável (quando aplicável)
- [ ] Feedbacks registrados e discutidos com o autor

## Migração de dados (se aplicável)

```sql
-- Exemplo de comando SQL para migração de dados
CREATE TABLE nova_tabela (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧬 Outras observações

> Qualquer detalhe extra que ajude quem revisa ou quem for manter esse código no futuro.

> Especificar aqui, caso tenha algum trecho do código que você acha que merece atenção especial, ou que tem alguma complexidade que não ficou clara na descrição acima.

- ...