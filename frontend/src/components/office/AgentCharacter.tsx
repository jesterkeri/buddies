import { useCallback } from 'react';
import { extend } from '@pixi/react';
import { Graphics as PixiGraphics, Text as PixiText, Container as PixiContainer, TextStyle } from 'pixi.js';
import type { CharacterData } from '../../game/characters';
import { TILE_SIZE } from '../../game/tilemap';

extend({ Graphics: PixiGraphics, Text: PixiText, Container: PixiContainer });

interface AgentCharacterProps {
  character: CharacterData;
  onClick?: () => void;
}

const CHAR_WIDTH = 32;
const CHAR_HEIGHT = 38;

const nameStyle = new TextStyle({
  fontFamily: 'Space Mono, monospace',
  fontSize: 10,
  fill: 0xf2f4f3,
  fontWeight: 'bold',
  letterSpacing: 1,
});

const statusStyle = new TextStyle({
  fontFamily: 'Space Mono, monospace',
  fontSize: 7,
  fill: 0x94a3b8,
});

export default function AgentCharacter({ character, onClick }: AgentCharacterProps) {
  const { pixelX, pixelY, bounceOffset, color, name, state } = character;

  const x = pixelX + (TILE_SIZE - CHAR_WIDTH) / 2;
  const y = pixelY + (TILE_SIZE - CHAR_HEIGHT) / 2 + bounceOffset;

  const drawCharacter = useCallback((g: PixiGraphics) => {
    g.clear();

    // Shadow
    g.ellipse(CHAR_WIDTH / 2, CHAR_HEIGHT + 2, CHAR_WIDTH / 2, 4);
    g.fill({ color: 0x000000, alpha: 0.4 });

    // Legs
    g.roundRect(CHAR_WIDTH / 2 - 10, CHAR_HEIGHT - 8, 7, 10, 1);
    g.fill(0x1a1a2a);
    g.roundRect(CHAR_WIDTH / 2 - 10, CHAR_HEIGHT - 8, 7, 10, 1);
    g.stroke({ color: 0x0a0a0a, width: 1.5 });
    g.roundRect(CHAR_WIDTH / 2 + 3, CHAR_HEIGHT - 8, 7, 10, 1);
    g.fill(0x1a1a2a);
    g.roundRect(CHAR_WIDTH / 2 + 3, CHAR_HEIGHT - 8, 7, 10, 1);
    g.stroke({ color: 0x0a0a0a, width: 1.5 });

    // Body (colored rectangle — comic book style)
    g.roundRect(2, 10, CHAR_WIDTH - 4, CHAR_HEIGHT - 18, 4);
    g.fill(color);
    g.roundRect(2, 10, CHAR_WIDTH - 4, CHAR_HEIGHT - 18, 4);
    g.stroke({ color: 0x0a0a0a, width: 2.5 });

    // Body stripe (belt/detail)
    g.rect(4, CHAR_HEIGHT - 14, CHAR_WIDTH - 8, 3);
    g.fill({ color: 0x0a0a0a, alpha: 0.3 });

    // Arms
    g.roundRect(-3, 14, 7, 16, 3);
    g.fill(color);
    g.roundRect(-3, 14, 7, 16, 3);
    g.stroke({ color: 0x0a0a0a, width: 1.5 });
    g.roundRect(CHAR_WIDTH - 4, 14, 7, 16, 3);
    g.fill(color);
    g.roundRect(CHAR_WIDTH - 4, 14, 7, 16, 3);
    g.stroke({ color: 0x0a0a0a, width: 1.5 });

    // Head
    g.roundRect(CHAR_WIDTH / 2 - 11, -4, 22, 18, 6);
    g.fill(color);
    g.roundRect(CHAR_WIDTH / 2 - 11, -4, 22, 18, 6);
    g.stroke({ color: 0x0a0a0a, width: 2.5 });

    // Face visor / mask area
    g.roundRect(CHAR_WIDTH / 2 - 9, 1, 18, 8, 3);
    g.fill({ color: 0x0a0a0a, alpha: 0.4 });

    // Eyes (white with pupils)
    g.circle(CHAR_WIDTH / 2 - 4, 5, 3.5);
    g.fill(0xf2f4f3);
    g.circle(CHAR_WIDTH / 2 - 4, 5, 3.5);
    g.stroke({ color: 0x0a0a0a, width: 1 });
    g.circle(CHAR_WIDTH / 2 + 4, 5, 3.5);
    g.fill(0xf2f4f3);
    g.circle(CHAR_WIDTH / 2 + 4, 5, 3.5);
    g.stroke({ color: 0x0a0a0a, width: 1 });

    // Pupils (look forward)
    g.circle(CHAR_WIDTH / 2 - 3.5, 5.5, 1.5);
    g.fill(0x0a0a0a);
    g.circle(CHAR_WIDTH / 2 + 4.5, 5.5, 1.5);
    g.fill(0x0a0a0a);

    // Typing indicator (dots above head)
    if (state === 'typing') {
      const dotY = -14;
      g.circle(CHAR_WIDTH / 2 - 6, dotY, 2.5);
      g.fill(0x2bb6b3);
      g.circle(CHAR_WIDTH / 2 - 6, dotY, 2.5);
      g.stroke({ color: 0x0a0a0a, width: 1 });
      g.circle(CHAR_WIDTH / 2, dotY, 2.5);
      g.fill(0x2bb6b3);
      g.circle(CHAR_WIDTH / 2, dotY, 2.5);
      g.stroke({ color: 0x0a0a0a, width: 1 });
      g.circle(CHAR_WIDTH / 2 + 6, dotY, 2.5);
      g.fill(0x2bb6b3);
      g.circle(CHAR_WIDTH / 2 + 6, dotY, 2.5);
      g.stroke({ color: 0x0a0a0a, width: 1 });
    }

    // Meeting indicator (yellow star)
    if (state === 'meeting') {
      g.star(CHAR_WIDTH / 2, -14, 5, 6, 3);
      g.fill(0xf9d616);
      g.star(CHAR_WIDTH / 2, -14, 5, 6, 3);
      g.stroke({ color: 0x0a0a0a, width: 1 });
    }
  }, [color, state]);

  return (
    <pixiContainer
      x={x}
      y={y}
      eventMode="static"
      cursor="pointer"
      onpointerdown={onClick}
    >
      <pixiGraphics draw={drawCharacter} />
      {/* Agent initial on body */}
      <pixiText
        text={name[0]}
        style={new TextStyle({
          fontFamily: 'Permanent Marker, cursive',
          fontSize: 14,
          fill: 0x0a0a0a,
          fontWeight: 'bold',
        })}
        x={CHAR_WIDTH / 2}
        y={22}
        anchor={0.5}
      />
      {/* Name label above */}
      <pixiText
        text={name.toUpperCase()}
        style={nameStyle}
        x={CHAR_WIDTH / 2}
        y={-22}
        anchor={0.5}
      />
      {/* State label below */}
      <pixiText
        text={state.toUpperCase()}
        style={statusStyle}
        x={CHAR_WIDTH / 2}
        y={CHAR_HEIGHT + 8}
        anchor={0.5}
      />
    </pixiContainer>
  );
}
