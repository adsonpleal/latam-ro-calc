import { Pipe, PipeTransform } from '@angular/core';
import { bareJobSprite } from 'src/app/domain/char-sprite-url';

// The URL builders themselves live in src/app/domain so the MCP server can bundle
// them without pulling Angular in; re-exported here so existing importers of the
// pipe module keep working.
export { bareJobSprite, buildCharSpriteUrl } from 'src/app/domain/char-sprite-url';

/** Standalone fallback pipe: bare job sprite from a preset's class id. */
@Pipe({ name: 'charSprite', standalone: true })
export class CharSpritePipe implements PipeTransform {
  transform(preset: Record<string, any> | null | undefined): string {
    return bareJobSprite(preset?.['class']);
  }
}
