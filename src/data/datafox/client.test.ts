import { describe, expect, it, vi } from 'vitest';

import { dataFoxFixture } from '../../model/adapters/datafox-fixture';

import { fetchTrace, type FetchLike } from './client';

function mockFetch(response: unknown, ok = true, status = 200): FetchLike {
  return vi.fn(async () => ({ ok, status, json: async () => response })) as unknown as FetchLike;
}

describe('fetchTrace', () => {
  it('POST /api/v3/spans/search，body filter.query=trace_id:<id>，响应经 fromDataFox', async () => {
    const f = mockFetch(dataFoxFixture);
    const trace = await fetchTrace('aabbccddeeff00112233445566778899', { baseUrl: 'http://datafox.test', fetch: f });
    expect(trace).not.toBeNull();
    expect(trace!.spans).toHaveLength(3);

    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://datafox.test/api/v3/spans/search');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.filter.query).toBe('trace_id:aabbccddeeff00112233445566778899');
  });

  it('baseUrl 尾斜杠归一化；默认 from/to', async () => {
    const f = mockFetch(dataFoxFixture);
    await fetchTrace('tid', { baseUrl: 'http://datafox.test/', fetch: f });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://datafox.test/api/v3/spans/search');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('now-1h');
    expect(body.to).toBe('now');
  });

  it('额外 headers 合并', async () => {
    const f = mockFetch(dataFoxFixture);
    await fetchTrace('tid', { baseUrl: 'http://datafox.test', fetch: f, headers: { authorization: 'Bearer x' } });
    const [, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer x');
  });

  it('traceId / baseUrl 必填校验', async () => {
    await expect(fetchTrace('', { baseUrl: 'http://x' })).rejects.toThrow('traceId 必填');
    // @ts-expect-error 故意缺 baseUrl
    await expect(fetchTrace('tid', {})).rejects.toThrow('baseUrl 必填');
  });

  it('非 2xx → 抛错', async () => {
    const f = mockFetch({}, false, 503);
    await expect(fetchTrace('tid', { baseUrl: 'http://datafox.test', fetch: f })).rejects.toThrow('503');
  });
});
