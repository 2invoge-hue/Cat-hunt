# CAT HUNT v0.2 — disfarces reais em 3D

Novo: seis objetos 3D (almofada, vaso, caixa, peluche, candeeiro e planta). Ao escolher um deles, o gato desaparece e é substituído pela geometria do objeto, que todos os jogadores ligados à sala veem. O jogador pode voltar a gato, e fica imóvel enquanto está disfarçado. Adereços semelhantes aparecem como decoração nos mapas.

## Executar

Instalar Node.js 18+ e, nesta pasta, executar:

```sh
npm install
npm start
```

Abrir http://localhost:3000. Para jogar pela Internet, publicar num serviço de alojamento Node.js compatível com WebSockets e HTTPS. A ligação ao CDN do Three.js requer Internet mesmo quando o servidor é local.

## Regras

2–10 jogadores por sala. O detetive é escolhido aleatoriamente. Os gatos têm 20 segundos para se esconderem, e a caçada dura 2 minutos. Cada gato pode escolher um dos seis disfarces. O detetive apanha um gato se estiver a 1,65 unidades dele. Ganham os gatos se resistirem até ao fim.

## Limitações do protótipo

- Não foi testado com vários telemóveis reais nem publicado num alojamento externo.
- A câmara é top-down 3D, com cenários low-poly simplificados; não há colisões físicas entre os objetos e jogadores.
- O disfarce é um verdadeiro modelo 3D, mas não há animação de transformação e não se encaixa automaticamente em posições específicas dos móveis.
- O servidor mantém salas em memória e ainda faltam persistência, contas, autenticação, reconexão e mais medidas anti-batota.
