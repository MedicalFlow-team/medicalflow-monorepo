# Armazenamento privado do Flowcare

O bucket de arquivos deve ser privado e não deve ter domínio público ou acesso anônimo. A aplicação usa o endpoint S3 do R2 e assina operações somente depois de validar uma `Membership` ativa.

## Regras

- Chaves começam sempre com `organizations/` e incluem a categoria antes da organização: `organizations/audio/<organizationId>/...`, `organizations/pdf/<organizationId>/...` ou `organizations/attachment/<organizationId>/...`.
- URLs de upload expiram em 10 minutos; URLs de download expiram em 15 minutos.
- Áudios aceitos: `audio/mp4`, `audio/webm` e `audio/mpeg`, até 50 MiB.
- PDFs e imagens JPEG/PNG aceitos até 25 MiB.
- Áudios brutos usam o prefixo `organizations/audio/` e uma regra de lifecycle para expirar depois da transcrição e do período de retenção aprovado (30 dias, conforme decisão regulatória).
- PDFs emitidos não devem ter regra de expiração automática; a retenção é perene até a política regulatória definir outra coisa.

## Verificação operacional

Use um objeto de teste sem dados clínicos. Uma requisição direta ao endpoint público do bucket, sem sessão e sem URL assinada, deve retornar `403 Access Denied`. A mesma chave, acessada por URL assinada emitida para uma pessoa com membership ativa, deve retornar `200` enquanto a assinatura estiver válida e falhar depois da expiração.

Registre apenas data, status HTTP, categoria do objeto e duração da URL. Não registre URLs completas, tokens, nomes de pacientes ou conteúdo de arquivos.

As regras de lifecycle e o bloqueio de acesso público são configuração do bucket e precisam ser conferidos no painel do Cloudflare R2 antes do fechamento da issue #205.
