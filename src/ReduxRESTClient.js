import Requests from './Requests';

// Responses with 4XX/5XX error status codes will be accompanied by an error message based on this logic:
//  1. If the error response body contains a string from the server, that message will be used, elsewise:
//  2. statusTextOverride[status code] is used when set below, elsewise:
//  3. response.statusText will be used.
const statusTextOverride = {
  401: 'Unauthorized, please login in order to complete this action',
  403: 'Forbidden - you are not allowed to perform this action',
  404: 'Page/Resource Not Found',
  409: 'Conflict - unable to perform this action'
};

class ReduxRESTClient {
  /**
   *  USAGE:
   *  Sub-class this to define a new type of resource. createSlice() which you must pass in from the redux library will
   *  be used to setup a slice containing CRUD actions & reducers, necessary to manage a _list of records in the redux slice.
   *  
   *  EXAMPLE:
   *  ====================================================================================================================
   *  import { createSlice, createSelector } from '@reduxjs/toolkit';
   * 
   *  class ChatMessages extends RecordSet {
   *    constructor() {
   *      super('chatMessages', { path: '/chat_messages', createSlice: createSlice, createSelector: createSelector });
   *    }
   *  }
   * 
   *  export default ChatMessages;
   *  ====================================================================================================================
   * 
   *  REDUX STORE SETUP:
   *  =====================================================================================================================
   *  import { configureStore } from '@reduxjs/toolkit';
   * 
   *  const store = configureStore({
   *    reducer: {
   *      chatMessages: ChatMessages.getReducer()
   *      ...
   *    }
   *  });
   *  =====================================================================================================================
   * 
   *  ACTIONS:
   *  =====================================================================================================================
   *  Actions to create() / read() / update() / delete() record(s) will be inherited by your sub-class. Your system
   *  must call dispatch(ChatMessages.create({ params }); where dispatch might come from dispatch = useDispatch() (import { useDispatch } from react-redux;)
   * 
   *  Requests will be sent to GET/POST/PUT/DELETE <window.location.host>/api/chat_messages.
   * 
   *  SELECTORS:
   *  =====================================================================================================================
   *  You can track the AJAX requests via using the selectors:  getRequest()/getRequestStatus() inherited by your sub-class.
   *  Furthermore you can use the selectors below to read the set of records[] contained in the redux slice:
   *    getAll()
   *    get(id)
   *    where(...)
   *    ...
   *  
   */   
  constructor(resourceName, options = {}) {
    options.path = options.path || `/${resourceName}`;
    this.resource = resourceName;
    this._idField = options.idField || '_id';
    this.path = options.path;
    if (!this.resource) {
      throw new Error('You must specify a resource name (eg. "chatMessages") (first argument to RecordSet contructor)');
    }

    this.createSlice = options.createSlice;
    this.createSelector = options.createSelector;
    if (!this.createSlice || !this.createSelector) {
      throw new Error('You must supply a second argument to the RecordSet constructor (options) containing at least createSlice() and createSelector() from @reduxjs/toolkit');
    }

    if (options.fetchFunction) {
      Requests.fetchFunction = options.fetchFunction;
    }

    this._sortFunction = (rec1, rec2) => {
      // Sort by id by default
      if (rec1[this._idField] < rec2[this._idField]) return -1;
      if (rec1[this._idField] > rec2[this._idField]) return 1;
      return 0;
    };

    this._slice = this.createSlice({
      name: resourceName,
      initialState: {
        isLoaded: false,
        records: [],
        error: null,
        requests: {}
      },
      reducers: {
        read: (state, action) => {
          state.isLoaded = true;
          action.payload.records.forEach(newRec =>  this._createOrUpdate(state.records, newRec));
          state.records.sort(this._sortFunction);
        },
        created: (state, action) => {
          action.payload.records.forEach(newRec =>  this._createOrUpdate(state.records, newRec));
          state.records.sort(this._sortFunction);
        },
        updated: (state, action) => {
          action.payload.records.forEach(newRec =>  this._createOrUpdate(state.records, newRec));
          state.records.sort(this._sortFunction);
        },
        deleted: (state, action) => {
          if (action.payload[this._idField]) {
            state.records = state.records.filter(rec => rec[this._idField] != action.payload[this._idField]);
            state.records.sort(this._sortFunction);
          } else if (action.payload.all) {
            state.records = [];
          }
        },
        updateRequest: (state, action) => {
          state.requests[action.payload.requestType] = {
            status: action.payload.status,
            statusCode: action.payload.statusCode || null,
            data: action.payload.data,
            error: action.payload.error || null
          };
        },
        clearRequest: (state, action) => {
          state.requests[action.payload.requestType] = null;
        },
        clear: state => {
          state.isLoaded = false;
          state.records = [];
          state.requests = {};
        }
      }
    });
  }

  setSortFunction(fn) {
    this._sortFunction = fn;
  }

  getReducer() {
    return this._slice.reducer;
  }

  getActions() {
    return this._slice.actions;
  }

  isLoaded() {
    return state => state[`${this.resource}`].isLoaded;
  }

  getAll() {
    return state => state[`${this.resource}`].records;
  }

  get(id) {
    return this.createSelector(
      state => state[`${this.resource}`].records,
      records => records.find(rec => rec[this._idField] == id)
    );
  }

  _filterRecords(records, conditions) {
    let list = records;
    Object.keys(conditions).forEach(key => {
      list = list.filter(rec => rec[key] == conditions[key]);
    });
    return list;
  }

  where(conditions) {
    return this.createSelector(
      state => state[`${this.resource}`].records,
      records => this._filterRecords(records, conditions)
    );
  }

  findBy(conditions) {
    return this.createSelector(
      state => state[`${this.resource}`].records,
      records => {
        const list = this._filterRecords(records, conditions);
        return list.length ? list[0] : null;
      }
    );
  }

  getRequest(requestType) {
    return state => state[`${this.resource}`].requests[requestType];
  }

  getRequestStatus(requestType) {
    return state => {
      const request = state[`${this.resource}`].requests[requestType];
      return request ? request.status : null;
    }
  }

  getError(requestType) {
    if (!requestType) {
      throw new Error('RecordSet#getError() must be called with a requestType argument');
    }

    return state => {
      const request = state[`${this.resource}`].requests[requestType];
      return request ? request.error : null;
    }
  }

  clearRequest(requestType) {
    if (!requestType) {
      throw new Error('RecordSet#clearRequest() must be called with a requestType argument');
    }

    return this._slice.actions.clearRequest({ requestType: requestType });
  }

  onRecordReceived(record) {
  }

  // May be called externally for custom (non-REST) requests
  doRequest(requestType, method, path, params = {}, onSuccess, onFailure) {
    return dispatch => {
      this._updateRequest(dispatch, requestType);

      const onFetched = response => {
        if (response.ok) {
          if (onSuccess) {
            // onSuccess function when provided is reponsible for:
            // 1. Updating any record(s)
            // 2. Afterwards onSuccess() must update the request info by calling:
            //    this._updateRequest(dispatch, requestType, response, null, data
            onSuccess(dispatch, response);
          } else {
            this._updateRequest(dispatch, requestType, response, null, data);
          }
        } else {
          // Request completed but the server responded with an error status code (4XX/5XX)
          if (onFailure) {
            // onFailure if provided, is reponsible for calling:
            // this._updateRequest(dispatch, requestType, response)
            onFailure(dispatch, requestType, response);
          } else {
            this._updateRequest(dispatch, requestType, response);
          }
        }
      };

      const onRequestFailure = error => {
        // Request failed (could not reach the server, so no response will be available)
        if (onFailure) {
          // onFailure if provided, is response for calling this._updateRequest(dispatch, requestType, null, error)
          onFailure(dispatch, requestType, null, error);
        } else {
          this._updateRequest(dispatch, requestType, null, error);
        }
      };

      return Requests.doRequest(method, path, params).then(onFetched, onRequestFailure);
    };
  }

  _updateRequest(dispatch, requestType, response, error, data) {
    const params = { requestType: requestType };
    if (response) {
      if (response.ok) {
        params.status = 'succeeded'
        if (data) {
          params.data = data;
        }
        params.statusCode = response.status;
        dispatch(this._slice.actions.updateRequest(params));
      } else {
        params.status = 'failed';

        const dispatchError = (text = null) => {
          const message = text || statusTextOverride[response.status] || response.statusText;
          params.error = { message: message };
          dispatch(this._slice.actions.updateRequest(params));
        };

        response.text().then(text => dispatchError(text), () => dispatchError(response.statusText));
      }
    } else if (error) {
      params.status = 'failed';
      params.error = { message: error.message };
      dispatch(this._slice.actions.updateRequest(params));
    } else {
      params.status = 'pending';
      dispatch(this._slice.actions.updateRequest(params));
    }
  }

  fetch(params = {}) {
    const onSuccess = (dispatch, response) => {
      return response.json().then(data => {
        const records = Array.isArray(data) ? data : [data];

        records.forEach(rec => this.onRecordReceived(rec));

        dispatch(this._slice.actions.read({ records: records }));
        this._updateRequest(dispatch, 'fetch', response, null, data);
      });
    };

    return this.doRequest('fetch', 'GET', this.path, params, onSuccess);
  }

  fetchById(id) {
    const onSuccess = (dispatch, response) => {
      return response.json().then(data => {
        this.onRecordReceived(data);
        dispatch(this._slice.actions.read({ records: [data] }));
        this._updateRequest(dispatch, 'fetchById', response, null, data);
      });
    };

    return this.doRequest('fetchById', 'GET', `${this.path}/${id}`, {}, onSuccess);
  }

  create(params = {}) {
    const onSuccess = (dispatch, response) => {
      return response.json().then(data => {
        this.onRecordReceived(data);
        dispatch(this._slice.actions.created({ records: [data] }));
        this._updateRequest(dispatch, 'create', response, null, data);
      });
    };

    return this.doRequest('create', 'POST', this.path, params, onSuccess);
  }

  update(params = {}) {
    const onSuccess = (dispatch, response) => {
      return response.json().then(data => {
        dispatch(this._slice.actions.updated({ records: [data] }));
        this._updateRequest(dispatch, 'update', response, null, data);
      });
    };

    return this.doRequest('update', 'PUT', this.path, params, onSuccess);
  }

  delete(params = {}) {
    const onSuccess = (dispatch, response) => {
      dispatch(this._slice.actions.deleted(params));
      this._updateRequest(dispatch, 'delete', response, null, params);
    };

    return this.doRequest('delete', 'DELETE', this.path, params, onSuccess);
  }

  clear() {
    return this._slice.actions.clear();
  }

  _createOrUpdate = (records, newRec) => {
    // Create or update the record in the store with the same id
    //this.onNewRecord(newRec);
    let existingRec = false;
    records.forEach(rec => {
      if (rec[this._idField] == newRec[this._idField]) {
        existingRec = true;
        // Update existing record, overwriting each property found in newRec
        for (const property in newRec) {
          rec[property] = newRec[property];
        }
      }
    });
    if (!existingRec) {
      records.push(newRec);
    }
  };
}

export default ReduxRESTClient;
