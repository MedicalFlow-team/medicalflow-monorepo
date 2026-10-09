# Flowcare — dicionário de métricas do MVP

**Origem:** decisão de produto #197. As fontes de agenda e transcrição ainda não existem no schema atual da API; este documento define o contrato para sua implementação. Não há números de exemplo apresentados como dados reais.

## Período e isolamento

Toda consulta recebe `organizationId` da clínica autorizada. O período usa o fuso IANA configurado na clínica: início inclusivo e fim exclusivo (`[start, end)`). O padrão do painel é **hoje** no fuso da clínica; filtros opcionais aceitam semana, mês ou intervalo explícito. Semana começa na segunda-feira. O backend devolve `periodStart`, `periodEnd` e `timeZone`; datas são armazenadas em UTC e agrupadas no fuso da clínica. Intervalos inválidos são recusados.

## Painel operacional

Fonte: agendamentos da clínica, associados à data/hora de início da consulta. Os totais usam o estado atual do agendamento no instante da consulta; mudanças posteriores podem alterar uma consulta histórica. Cancelado nunca conta como falta.

| Campo | Fórmula exata | Exibição |
|---|---|---|
| `totalAppointments` | Número de agendamentos com início no período, incluindo cancelados. | Inteiro |
| `scheduledAppointments` | Número desses agendamentos ainda agendados/confirmados. | Inteiro |
| `completedAppointments` | Número desses agendamentos com atendimento concluído. | Inteiro |
| `cancelledAppointments` | Número desses agendamentos cancelados. | Inteiro |
| `noShowAppointments` | Número desses agendamentos marcados como falta. | Inteiro |
| `noShowRate` | `noShowAppointments / (completedAppointments + noShowAppointments)`; `null` se o denominador for zero. | Percentual, uma casa decimal |

Os quatro estados acima devem ser mutuamente exclusivos na fonte. `totalAppointments = scheduledAppointments + completedAppointments + cancelledAppointments + noShowAppointments`. Se o modelo de agenda acrescentar outro estado, a tarefa de implementação deve atualizar o dicionário e o contrato antes de exibi-lo. O painel pode listar próximos atendimentos em rota própria; essa lista não altera as fórmulas. Tendências, taxa de confirmação e produtividade por profissional ficam fora do primeiro painel, pois não têm evento/fonte definidos.

## Consumo de transcrição

Fonte: um registro de processamento por áudio, com `audioId`, `consultationId`, `professionalId`, `finishedAt`, `durationSeconds`, estado e vínculo de tentativas. Só áudio concluído com sucesso entra no consumo. Retentativas do mesmo áudio não somam outra vez. Falhas internas e do provedor têm `billableSeconds = 0` e aparecem em `failedAudioCount` para diagnóstico. O mês de referência é o mês de `finishedAt` no fuso da clínica.

| Campo | Fórmula exata | Exibição |
|---|---|---|
| `processedSeconds` | Soma de `durationSeconds` dos áudios distintos concluídos com sucesso no período. | Inteiro, unidade canônica |
| `processedMinutes` | `processedSeconds / 60`, arredondado apenas para exibição. | Minutos com duas casas |
| `successfulAudioCount` | Contagem de `audioId` distintos concluídos com sucesso. | Inteiro |
| `transcribedConsultations` | Contagem de `consultationId` distintos com ao menos um áudio concluído com sucesso. | Inteiro |
| `failedAudioCount` | Contagem de áudios cuja situação final no período é falha. | Inteiro |

O detalhamento por profissional usa o profissional da consulta no momento do processamento. A soma de `processedSeconds` das linhas deve igualar o total da clínica; áudios sem profissional associado devem aparecer em linha `unassigned`, sem desaparecer do total. A interface pode explicar `processedMinutes`, mas não deve arredondar cada áudio antes da soma.

O **valor estimado em R$** e uma **cota mensal** só entram no contrato quando houver tarifa e regra de cobrança aprovadas. Até lá, a tela apresenta volume de uso, sem inventar custo ou limite. Esta decisão não altera faturamento real do provedor.

## Exemplo verificável

No mesmo dia local, há 10 agendamentos: 2 agendados, 5 concluídos, 2 cancelados e 1 falta. A resposta é `totalAppointments=10`, `scheduledAppointments=2`, `completedAppointments=5`, `cancelledAppointments=2`, `noShowAppointments=1` e `noShowRate=1/6 ≈ 16,7%`.

Três áudios de consultas distintas terminam com 65, 55 e 40 segundos; o terceiro falha. O consumo é `processedSeconds=120`, `processedMinutes=2,00`, `successfulAudioCount=2`, `transcribedConsultations=2`, `failedAudioCount=1`. Reprocessar um dos dois áudios com sucesso não acrescenta segundos.

## Execução

API do painel #229, interface #233 e isolamento #235; processamento de transcrição #265; consulta de consumo #306, interface #312 e QA #313. Antes de implementar, as tarefas de agenda e transcrição devem registrar os estados e campos de origem usados nas fórmulas. Agregação SQL simples e filtrada por clínica é suficiente no início; índices e medição de desempenho orientam qualquer otimização posterior.
