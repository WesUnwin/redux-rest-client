import ReduxRESTClient from '../dist/index'; // Run npm run build first

describe('ReduxRESTClient', () => {
  let restClient;
  let createSlice;
  let createSelector;
  let slice;
  let dispatch;

  beforeEach(() => {
    createSelector = jest.fn(fn => fn);

    slice = {
      state: null,
      reducer: 'reducer'
    };

    createSlice = jest.fn(config => {
      slice.state = config.initialState;

      // Populate slice.actions based on reducers...
      slice.actions = {};
      for (const reducer in config.reducers) {
        slice.actions[reducer] = function(payload) {
          return function() {
            console.log(`Invoking config.reducers[${reducer}]...`);
            const action = { payload };
            config.reducers[reducer](slice.state, action);
            console.log('New state of slice: ', slice.state);
          };
        };
      }


      return slice;
    });

    dispatch = jest.fn(action => {
      console.log('dispatch() invoked...');
      action();
    });

    restClient = new ReduxRESTClient('resource', { createSlice, createSelector });
  });

  describe('getReducer', () => {
    it('returns the slice\'s reducer', () => {
      expect(restClient.getReducer()).toBe(slice.reducer);
    });
  });

  describe('fetch', () => {
    describe('Request Successful', () => {
      let records;
      let response;

      beforeEach(() => {
        records = [{ _id: 'sfjweojf', }, { _id: 'fjieos' }];

        response = {
          text: jest.fn(() => Promise.resolve('')),
          json: jest.fn(() => Promise.resolve(records)),
          ok: true,
          status: 200
        };

        global.window = {
          fetch: jest.fn(() => Promise.resolve(response))
        };
      });

      describe('default fetch function', () => {
        it('makes a GET request to /api/<resourcname>?<params> using window.fetch', () => {
          const action = restClient.fetch({ param1: 'value1', param2: 'value2' });
          action(dispatch);
          expect(window.fetch).toBeCalledWith('/api/resource?param1=value1&param2=value2', { method: 'GET', 'credentials': 'same-origin', headers: { 'Content-Type': 'application/json' } });
        });
      });

      describe('custom fetch function', () => {
        let customFetchFunction;

        beforeEach(() => {
          customFetchFunction = jest.fn(() => Promise.resolve(response));
          restClient = new ReduxRESTClient('resource', { createSlice, createSelector, fetchFunction: customFetchFunction });
        });

        it('makes a GET request to /api/<resourcname>?<params> using window.fetch', () => {
          const action = restClient.fetch({ param1: 'value1', param2: 'value2' });
          action(dispatch);
          expect(window.fetch).not.toBeCalled();
          expect(customFetchFunction).toBeCalledWith('/api/resource?param1=value1&param2=value2', { method: 'GET', 'credentials': 'same-origin', headers: { 'Content-Type': 'application/json' } });
        });
      });
    });
  });
});
