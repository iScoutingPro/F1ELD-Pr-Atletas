---
description: Atualiza o CLAUDE.md com o que mudou, faz o commit e envia para o GitHub
argument-hint: "[mensagem do commit, opcional]"
---

Salve o trabalho feito até aqui, nesta ordem:

1. **Ver o que mudou.** Rode `git status` e `git diff` (e `git log -5 --oneline` para seguir o estilo das mensagens). Se não houver nada alterado, avise e pare.

2. **Atualizar o `CLAUDE.md`.** Leia as partes do arquivo que tratam das telas e dos arquivos alterados e ajuste para refletir o estado atual do código, no mesmo estilo do que já está escrito:
   - o que mudou, com a data de hoje, e se foi pedido do usuário ou escolha nossa;
   - o que o usuário pediu para tirar ou não mexer ("não recolocar sem pedido");
   - como foi conferido (só pela compilação, visto na tela pelo usuário, testado no iPhone);
   - corrija ou apague trechos que ficaram desatualizados, em vez de só acrescentar texto novo.
   Use também o que foi conversado nesta sessão. Se nada do que mudou merece registro, não altere o arquivo.

3. **Compilar.** Rode `npm run build`. Se falhar, mostre o erro e pare, sem commit.

4. **Commit.** Adicione os arquivos alterados (confira que nenhum `.env*` além do `.env.example` entra) e faça um commit só, na `main`, com mensagem em português resumindo as mudanças. Se o usuário passou uma mensagem, use-a: $ARGUMENTS

5. **Push.** Rode `git push origin main`. Se o GitHub pedir login, avise o usuário para fazer na janela do navegador; não peça senha nem token pelo chat.

6. **Resumo.** Diga em poucas linhas o que foi registrado no `CLAUDE.md`, a mensagem do commit e se o push foi concluído.
