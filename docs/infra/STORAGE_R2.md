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

Use um objeto de teste sem dados clínicos. Este bucket não tem endpoint público: `r2.dev` está desativado e não há domínio personalizado. O endpoint S3 sem assinatura retorna `400 Bad Request` para GET anônimo; esse status não deve ser interpretado como arquivo público. Uma URL assinada permite acesso durante sua validade e retorna `403` após expirar.

Registre apenas data, status HTTP, categoria do objeto e duração da URL. Não registre URLs completas, tokens, nomes de pacientes ou conteúdo de arquivos.

As regras de lifecycle e o bloqueio de acesso público são configuração do bucket e precisam ser conferidos no painel do Cloudflare R2 antes do fechamento da issue #205.

## Evidência em 2026-10-09

Foi enviado um objeto sintético sem dados clínicos para `organizations/attachment/` com uma URL assinada: PUT `200`. A leitura por URL assinada retornou GET `200` e conteúdo idêntico. GET anônimo pelo endpoint S3 retornou `400`. Uma URL de leitura de teste com validade de 1 segundo retornou GET `403` após a expiração. Os testes automatizados verificam que o backend emite upload por 600 segundos e download por 900 segundos, recusa MIME/tamanho inválidos e impede usuários sem membership ativa ou de outra organização de receber uma URL.

O critério literal da issue que exige `403` em acesso anônimo direto não corresponde ao comportamento do endpoint S3 privado do R2, que retorna `400`. A privacidade é sustentada pela ausência de endpoint público e pelo sucesso apenas da URL assinada. A validação acima usou credenciais de teste locais e não comprova que a API de produção já tenha as variáveis `STORAGE_*` configuradas.
