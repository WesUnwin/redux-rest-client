import RecordSet from '../dist/index'; // Run npm run build first

describe('RecordSet', () => {
  let recordSet;
  let createSlice;
  let createSelector;
  let slice;
  let dispatch;

  beforeEach(() => {
    createSelector = jest.fn(fn => fn);

    slice = {
      reducer: 'reducer',
      actions: {
        updateRequest: jest.fn()
      }
    };

    createSlice = jest.fn(_config => slice);

    dispatch = jest.fn(_action => {

    });

    recordSet = new RecordSet('resource', { createSlice, createSelector });
  });

  describe('getReducer', () => {
    it('returns the slice\'s reducer', () => {
      expect(recordSet.getReducer()).toBe(slice.reducer);
    });
  });

  describe('fetch', () => {
    describe('Request Successful', () => {
      beforeEach(() => {
        const response = {
          text: jest.fn(() => Promise.resolve(''))
        };

        global.window = {
          fetch: jest.fn(() => Promise.resolve(response))
        };
      });

      it('makes a GET request to /api/<resourcname>?<params> using window.fetch', () => {
        const action = recordSet.fetch({ param1: 'value1', param2: 'value2' });
        action(dispatch);
        expect(window.fetch).toBeCalledWith('/api/resource?param1=value1&param2=value2', { method: 'GET', 'credentials': 'same-origin', headers: { 'Content-Type': 'application/json' } });
      });
    });

  });
});
