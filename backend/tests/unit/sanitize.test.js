import { sanitizeRequest } from '../../index.js';

const run = (body) => {
  const req = { body };
  sanitizeRequest(req, {}, () => {});
  return req.body;
};

describe('sanitizeRequest', () => {
  it('strips MongoDB operator keys from nested objects', () => {
    expect(run({ email: { $ne: null }, name: 'Nusrat' })).toEqual({ name: 'Nusrat' });
  });

  it('strips dotted keys', () => {
    expect(run({ 'studentProfile.studentId': 'x', name: 'Nusrat' })).toEqual({ name: 'Nusrat' });
  });

  it('strips prototype-pollution keys', () => {
    const body = JSON.parse('{"__proto__": {"polluted": true}, "name": "Nusrat"}');

    expect(run(body)).toEqual({ name: 'Nusrat' });
    expect({}.polluted).toBeUndefined();
  });

  it('keeps normal nested payloads intact', () => {
    const body = {
      name: 'Nusrat',
      studentProfile: { studentId: 'DIU-2026-100' },
      tags: ['a', 'b'],
    };

    expect(run(body)).toEqual(body);
  });

  it('does nothing when there is no body', () => {
    const req = { body: undefined };
    sanitizeRequest(req, {}, () => {});
    expect(req.body).toBeUndefined();
  });
});
