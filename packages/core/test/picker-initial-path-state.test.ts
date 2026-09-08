import { describe, expect, it } from 'vitest';
import { parsePickerPath, formatPickerPath, pickerParentPath } from '../src/components/ui/picker/PickerNavigation';

describe('picker absolute path semantics', () => {
  it('never changes an absolute path according to Home', () => {
    for (const input of ['/', '/workspace', '/Users/demo/workspace', '/Volumes/开发 项目']) {
      expect(parsePickerPath(input, '/Users/demo')).toBe(input);
    }
  });
  it('formats Home only at a segment boundary', () => {
    expect(formatPickerPath('/Users/demo', '/Users/demo')).toBe('~');
    expect(formatPickerPath('/Users/demo/project', '/Users/demo')).toBe('~/project');
    expect(formatPickerPath('/Users/demo-other', '/Users/demo')).toBe('/Users/demo-other');
  });
  it('normalizes logical separators and traversal without resolving symbolic links', () => {
    expect(parsePickerPath('/Volumes//team/./project/../other/')).toBe('/Volumes/team/other');
    expect(parsePickerPath('/../../')).toBe('/');
    expect(pickerParentPath('/Volumes/team')).toBe('/Volumes');
    expect(pickerParentPath('/')).toBe('/');
  });
  it('rejects relative paths, missing Home, user expansion and NUL', () => {
    for (const input of ['', 'repo', '~', '~/repo', '~another/repo', '/bad\0path']) expect(parsePickerPath(input)).toBe('');
  });
});
