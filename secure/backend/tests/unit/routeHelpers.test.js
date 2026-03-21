'use strict';

const { handleError } = require('../../utils/routeHelpers');

describe('handleError', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('always responds with HTTP 500', () => {
    handleError(res, new Error('boom'), 'test context');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.status).toHaveBeenCalledTimes(1);
  });

  it('response body contains "Internal server error" key', () => {
    handleError(res, new Error('db gone'), 'query');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' })
    );
  });

  it('response body contains the original error message as "details"', () => {
    handleError(res, new Error('connection timeout'), 'query');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ details: 'connection timeout' })
    );
  });

  it('logs using console.error with the context prefix', () => {
    handleError(res, new Error('oops'), 'MyContext');
    expect(console.error).toHaveBeenCalledWith('MyContext:', expect.any(Error));
  });

  it('works when context argument is omitted', () => {
    expect(() => handleError(res, new Error('err'))).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('logs with default context when none provided', () => {
    handleError(res, new Error('x'));
    expect(console.error).toHaveBeenCalledWith('Unhandled error:', expect.any(Error));
  });

  it('calls status() before json() (correct Express chain)', () => {
    const callOrder = [];
    res.status.mockImplementation(() => { callOrder.push('status'); return res; });
    res.json.mockImplementation(() => { callOrder.push('json'); return res; });
    handleError(res, new Error('e'), 'ctx');
    expect(callOrder).toEqual(['status', 'json']);
  });
});
