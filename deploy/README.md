# Deploy manual

O workflow `Deploy` (`.github/workflows/deploy.yml`) só corre quando iniciado em **Actions → Deploy → Run workflow**. Faz build da SPA, envia uma release identificada pelo commit e troca o symlink `current` de forma atómica.

## Preparar o servidor (129.159.1.38)

O servidor já tem Nginx em Docker a servir vários sites. A app corre num container estático próprio, ligado à rede existente `nei-rally-dev_rally`; o virtual host `pei-alinha.duckdns.org` termina TLS no proxy partilhado. Não instalar um segundo proxy nas portas 80/443.

1. Confirma que o utilizador `ubuntu` tem a chave pública autorizada e acesso sudo. O workflow não usa a conta root.
2. Cria `/var/www/alinha/releases`, envia uma primeira build para uma pasta de release e aponta `/var/www/alinha/current` para essa pasta com um symlink **relativo** (por exemplo `releases/<sha>`).
3. Copia `deploy/` para o servidor e executa `sudo bash setup-server.sh` a partir dessa pasta. O script inicia o container estático, acrescenta um virtual host ao proxy existente, emite o certificado TLS e configura a renovação automática.

## GitHub Actions

Define estes **Repository secrets**:

- `DEPLOY_HOST`: `129.159.1.38`
- `DEPLOY_USER`: utilizador criado/autorizado no servidor
- `DEPLOY_SSH_PRIVATE_KEY`: chave privada correspondente à chave autorizada
- `DEPLOY_SSH_KNOWN_HOSTS`: linha `known_hosts` verificada para o servidor (não desativar a validação de host)

Define a **Repository variable** `DEPLOY_PATH` com `/var/www/alinha`. O utilizador `ubuntu` precisa de poder escrever nesse caminho. Após o workflow chegar à branch por omissão do repositório e os secrets estarem definidos, inicia manualmente `Deploy` no separador Actions.

## DuckDNS

O registo A `pei-alinha.duckdns.org` já resolve para `129.159.1.38`. Para manter o IP sincronizado se mudar, instala um updater DuckDNS com o token guardado num ficheiro legível apenas por root e agenda-o com systemd timer. Não guardes o token DuckDNS no repositório nem nos logs do workflow.

Portas de entrada necessárias: TCP 22 (SSH), 80 (HTTP/Let's Encrypt) e 443 (HTTPS), nas regras de rede da VM.
