import { describe, expect, it } from 'vitest';
import { redevenV1TypeIds } from '../src/contracts/redeven_v1/typeIds';
import { toWireFsListRequest, fromWireFsListResponse } from '../src/contracts/redeven_v1/codec/fs';
import { fromWireTerminalOutputNotify } from '../src/contracts/redeven_v1/codec/terminal';

describe('redeven_v1 contract', () => {
  it('should align type ids with redeven-agent (fs/terminal/monitor)', () => {
    expect(redevenV1TypeIds.fs.rename).toBe(1004);
    expect(redevenV1TypeIds.fs.copy).toBe(1005);
    expect(redevenV1TypeIds.terminal.output).toBe(2004);
    expect(redevenV1TypeIds.monitor.sysMonitor).toBe(3001);
  });

  it('should encode fs.list request to snake_case wire payload', () => {
    expect(toWireFsListRequest({ path: '/tmp', showHidden: false })).toEqual({ path: '/tmp', show_hidden: false });
    expect(toWireFsListRequest({ path: '/tmp' })).toEqual({ path: '/tmp', show_hidden: undefined });
  });

  it('should decode fs.list response from wire payload', () => {
    const resp = fromWireFsListResponse({
      entries: [
        {
          name: 'a.txt',
          path: '/a.txt',
          is_directory: false,
          size: 12,
          modified_at: 10,
          created_at: 9,
          permissions: '-rw-r--r--',
        },
      ],
    });

    expect(resp.entries[0]).toEqual({
      name: 'a.txt',
      path: '/a.txt',
      isDirectory: false,
      size: 12,
      modifiedAt: 10,
      createdAt: 9,
      permissions: '-rw-r--r--',
    });
  });

  it('should decode terminal output notify into bytes', () => {
    const ev = fromWireTerminalOutputNotify({
      session_id: 's1',
      data_b64: btoa('hi'),
      sequence: 1,
      timestamp_ms: 2,
      echo_of_input: false,
      original_source: 'web',
    });

    expect(ev?.sessionId).toBe('s1');
    expect(new TextDecoder().decode(ev?.data ?? new Uint8Array())).toBe('hi');
    expect(ev?.sequence).toBe(1);
    expect(ev?.timestampMs).toBe(2);
    expect(ev?.echoOfInput).toBe(false);
    expect(ev?.originalSource).toBe('web');
  });
});

