[![npm version](https://badge.fury.io/js/redux-rest-client.svg)](https://badge.fury.io/js/redux-rest-client)

# redux-rest-client

A REST API client library, for use with redux (react-redux and @reduxjs/toolkit).

This library allows you to use redux to implement the common tasks of interfacing with REST APIs and storring an array of records obtained from each REST API.

Records are storred in a redux slice, using Redux's ```createSlice()```.

This library internally uses window.fetch() to send requests, but can be configured to use something else.

## Installation
```
  npm install --save redux-rest-client
```

## Benefits

* Implements functionality common to most modern web apps to interact with APIs and to access/manage/sort/filter records from your database.
* Allows you to scale your app gracefully, defining new REST clients with minimal overhead.
* Provides a clean, and consistent API throughout your app.
* Supports request tracking, allowing you to build UI to display spinners, error messages, etc.
* Zero package dependencies! (keeping in mind you will want to use this in conjuction with redux).

## Setting Up Your ReduxRESTClient(s)
To use this libary simply import ReduxRESTClient (the default export of this package) and begin creating sub-classes to configure
the necessary REST resources for using your system's REST APIs.

Each sub-class is used to store records of a given type (a resource).
The sub-class fetches records by interfacing with a REST API to create/read/update/delete (CRUD) records of a given type.

createSlice(), which you must pass in from the redux library will be used to setup a slice containing CRUD actions & reducers, necessary to manage a list of records in the redux slice.

Example: ChatMessages.js  (Inside your app)
```
  import ReduxRESTClient from 'redux-rest-client';
  import { createSlice, createSelector } from '@reduxjs/toolkit';

  class ChatMessages extends ReduxRESTClient {
    constructor() {
      super('chatMessages', { path: '/chat_messages', createSlice: createSlice, createSelector: createSelector });
    }
  }
      
  export default new ChatMessages();
```

## Adding to Your Redux Store
You must then add the reducer for the above subclass to your Redux store:
```
  import ChatMessages from './features/ChatMessages'; // The above example file
  import { configureStore } from '@reduxjs/toolkit';
  
  const store = configureStore({
    reducer: {
      chatMessages: ChatMessages.getReducer()
      ...
    }
  });

  export default store;
```

## Using Your ReduxRESTClient(s)
Each sub-class of ReduxRESTClient that you create and add to your store can they be used to:

1. Send requests to your REST APIs, via CRUD actions (create()/read()/update()/delete())
2. Read the list of records stored in the slice via a variety of selectors (eg. getAll() get(id), where(...))

```
  import ChatMessages from './features/ChatMessages';
  import { useDispatch, useSelector } from 'react-redux';

  // A React JS component that makes use of the ChatMessages ReduxRESTClient.
  const ChatMessages = () => {
    const dispatch = useDispatch();
    const messages = useSelector(ChatMessages.getAll());

    useEffect(() => {
      // On mount, send a GET /chat_messages request
      dispatch(ChatMessages.fetch());

      return () => dispatch(ChatMessages.clearRequest('fetch'));
    }, []);

    // Network request status for the "fetch" request
    const requestStatus = useSelector(ChatMessages.getRequestStatus('fetch'));
    const error = useSelector(ChatMessages.getError('fetch'));

    const clearError = () => {
      dispatch(ChatMessages.clearRequest('fetch'));
    };

    const onClick = {
      // Sends a POST request to /chat_messages
      dispatch(ChatMessages.create({ text: "Hello World!" }));
    };

    return (
      <div>
        {(requestStatus == 'pending') &&
          <p>Loading..</p>
        }

        {error &&
          <p style={{color: 'red'}} onClick={clearError}>
            {error.message}
          </p>
        }

        <ul>
          {messages.map(msg => (
            <li>{msg.text}</li>
          ))}
        </ul>

        <button onClick={onClick}>
          Send Chat Message
        </button>
      </div>
    );
  }

  export default ChatMessages;
```

## Records
Each ReduxRESTClient instance internaly stores an array of records (such as rows from a database) returned from an associated REST API.
Records are simply plain javascript objects, uniquely identified by some ID field (by default, this is the _id field, but this can be customized via options.idField).

```
  [ { _id: 'fxxwefw12eab1', ...}, { _id: 'fex1298eab2', ...}, ... ]
```

### Sorting
The list of records inside each rest client are sorted by _id by default.

The default sort function is:
```
function(rec1, rec2) {
  // Sort by id by default, in ascending order (larger _id later in the array)
  if (rec1._id < rec2._id) return -1;
  if (rec1._id > rec2._id) return 1;
  return 0;
}
```

You can customize the order of how records are stored by using ```setSortFunction(function)```.

Example:  To keep the list of records ordered by the createdAt field:

```
class Messages extends ReduxRESTClient {
  constructor() {
    super('messaages', ...);
    this.setSortFunction(function(rec1, rec2) {
      // Most recently created accounts first, oldest last
      if (rec1.createdAt > rec2.createdAt) return -1;
      if (rec1.createdAt < rec2.createdAt) return 1;
      return 0;
    });
  }
}

```

## Commonizing Configuration Across Your App
Depending on your situation you may want to introduce a super class to commonize configuration across all your rest clients.
An easy way to achieve this is to create a class (lets call it AppRESTClient) that all your rest clients extend, that in turn extends ReduxRESTClient:
```
                                extends                    extends
  ChatMessages, Accounts, ... ==========> AppRESTClient ==========> ReduxRESTClient
```

Inside your AppRESTClient class, you can perform tasks that should be common to all rest clients:
```
import { createSlice, createSelector } from '@reduxjs/toolkit';
import ReduxRESTClient from 'redux-rest-client';
import UserAccount from 'client/features/UserAccount';

class AppRESTClient extends ReduxRESTClient {
  constructor(resourceName, api = resourceName) {
    super(resourceName, { path: `/api/${api}`, createSlice: createSlice, createSelector: createSelector, fetchFunction: AppRESTClient._fetchFunction });
  }

  static _fetchFunction(url, options) {
    const accountJWT = UserAccount.getJWT();
    if (accountJWT) {
      options.headers['authorization'] = `BEARER ${accountJWT}`;
    }

    return window.fetch(url, options);
  }
}

export default AppRESTClient;
```

Now ChatMessages would become:
```
class ChatMessages extends AppRESTClient {
  ...
}
```

## Custom (Non-REST) Requests
You may occassionallly want to send requests to custom APIs that may not be REST compatible.
You can send custom requests, but still leverage some of the request handling logic of this library by using the doRequest() function.

Example custom request:
```
  ...
  class UserAccount extends ReduxRESTClient {
    ...
    login(params) {
      const onLoginSuccess = (dispatch, response) => {
        return response.json().then(data => {
          dispatch(this._slice.actions.read({ records: [data] }));
          dispatch(this._slice.actions.updateRequest({ requestType: 'login', status: 'succeeded' }));
        });
      };

      return this.doRequest('login', 'POST', '/api/login', params, onLoginSuccess);
    }
  }

```

## ReduxRESTClient API
Your subclass will inherit actions - function that can be used to send requests to the associated REST API,
and selectors that can be used read the list of records and hook components into re-rendering when needed.


### Constructor
The first argument should be a string identifying the name of the resource/slice (eg. "chatMessages", "accounts", etc)
The second argument (options) is used to pass an object containing the following properties:

| Option | Description |
| --- | --- |
| `createSlice` | (REQUIRED) should be set to { createSlice } from '@reduxjs/toolkit'. |
| `createSelector` | (REQUIRED) should be set to { createSelector } from '@reduxjs/toolkit'. |
| `path` | (OPTIONAL) Customizes the base path of the URL for the REST API. Defaults to: `/${ResourceName}`. |
| `fetchFunction` | (OPTIONAL) a function that will be called instead of directly calling window.fetch(). Use this to customize how requests are performed in your app. Defaults to (url, options) => window.fetch(url, options). |
| `idField` | (OPTIONAL) Used to specify which field/property records should be unique by (for merging and sorting). Default: '_id' |

### Actions

NOTE: The below action methods create and return an action object. The action must then be dispatched, in order to be executed.

```
  import { useDispatch } from 'react-redux';
  ...
  const dispatch = useDispatch();
  ...
  const action = MyRestClient.create(...);
  dispatch(action);
```

| Method | Description |
| --- | --- |
| `create(params)` | Returns an action that sends a POST request to <options.path> and stores the server's response in a record. |
| `fetch(params)` | Returns an action that sends a GET request to <options.path> and stores the array of records returned by the server inside the slice. |
| `fetchById(id)` | Returns an action that sends a GET request to <options.path>/id and stores the single record returned by the server inside the slice. |
| `update(params)` | Returns an action that sends a PUT request to <options.path> and creates/updates a record in the slice using the server's response. |
| `delete(params)` | Returns an action that sends a DELETE request to <options.path> then removes the record with the given _id from the list of records. |
| `clearRequest(requestType)` | Returns an action that would clear the request status. This is done automatically upon starting a new request.  |


### Selectors
Selectors in redux are how you read state, and respond to state changes.

NOTE: The below methods return a selector, and the selector must be used with useSelector() or similar.

```
  import { useSelector } from 'react-redux';
  ...
  const records = useSelector(MyRestClient.getAll());
```

| Method | Description |
| --- | --- |
| `isLoaded()` | Returns true if the slice has been populated once or more with records (elsewise returns false). |
| `getAll()` | Return a selector that will return the entire array of records inside the slice. |
| `get(id)` | Returns a selector that will return the individual record (an object) with the specified id. |
| `where(conditions)` | Returns a selector that returns all records matching the given conditions given as an object of key/value pairs eg. { attribute1: 'value1, ... }. |
| `findBy(conditions)` | Same as where() but will return just the first matching record. |
| `getRequestStatus(requestType)` | Returns an object of the form: ```{ status: 'pending'/'failed'/'succeeded', statusCode: 200, data: {}, error: ErrorObject }``` representing the state of the given request. Valid request types are: 'create', 'fetch', 'fetchById', 'update', 'delete'. |
