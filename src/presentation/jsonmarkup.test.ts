import { describe, expect, it } from 'vitest';

import jsonMarkup, { parseIfComplexJson } from './jsonMarkup';

describe('jsonMarkup', () => {
  it('各类型产出对应 json-markup-* 类', () => {
    const html = jsonMarkup({ s: 'hi', n: 42, b: true, z: null });
    expect(html).toContain('class="json-markup"');
    expect(html).toContain('json-markup-key');
    expect(html).toContain('json-markup-string');
    expect(html).toContain('json-markup-number');
    expect(html).toContain('json-markup-bool');
    expect(html).toContain('json-markup-null');
  });

  it('数组渲染各元素（字符串引号被 HTML 转义为 &quot;）', () => {
    const html = jsonMarkup([1, 'a', false]);
    expect(html).toContain('>1<');
    expect(html).toContain('&quot;a&quot;'); // "a" 的引号被转义
    expect(html).toContain('>false<');
  });

  it('HTML 转义——字符串值里的 <script> 被转义而非原样输出', () => {
    const html = jsonMarkup({ x: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('空对象/空数组', () => {
    expect(jsonMarkup({})).toContain('{}');
    expect(jsonMarkup([])).toContain('[]');
  });
});

describe('parseIfComplexJson', () => {
  it('对象/数组字符串 → 解析', () => {
    expect(parseIfComplexJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseIfComplexJson('[1,2]')).toEqual([1, 2]);
  });
  it('本身是对象 → 原样返回', () => {
    const o = { a: 1 };
    expect(parseIfComplexJson(o)).toBe(o);
  });
  it('普通字符串/数字 → null（非复杂 JSON）', () => {
    expect(parseIfComplexJson('GET')).toBeNull();
    expect(parseIfComplexJson('200')).toBeNull();
    expect(parseIfComplexJson(200)).toBeNull();
  });
  it('坏 JSON 字符串 → null（parse 失败回退）', () => {
    expect(parseIfComplexJson('{bad json')).toBeNull();
  });
});
