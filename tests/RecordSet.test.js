import RecordSet from '../dist/index'; // Run npm run build first

describe('RecordSet', () => {
  let recordSet;
  let createSlice;
  let createSelector;
  let slice;

  beforeEach(() => {
    createSelector = jest.fn(fn => fn);

    slice = { reducer: 'reducer', actions: {} };
    createSlice = jest.fn(_config => slice);

    recordSet = new RecordSet('resourceName', { createSlice, createSelector });
  });

  describe('getReducer', () => {
    it('returns the slice\'s reducer', () => {
      expect(recordSet.getReducer()).toBe(slice.reducer);
    });
  });
});
