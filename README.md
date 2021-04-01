[![npm version](https://badge.fury.io/js/redux-rest-client.svg)](https://badge.fury.io/js/redux-rest-client)

# redux-rest-client

A REST API client library, for use with redux (react-redux and @reduxjs/toolkit).

This library allows you to use redux to implement the common tasks of interfacing with REST APIs and storring an array of records obtained from each REST API.

Records are storred in a redux slice, using Redux's ```createSlice()```.

This library internally uses window.fetch() to send requests, but can be configured to use something else.

## Installation
```
  npm install --save react-rest-client
```

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
      super('chatMessages', { path: '/chat_messages', createSlice, createSelector });
    }
  }
      
  export default ChatMessages;
```

## Adding to Your Redux Store
You must then add the reducer for the above subclass to your Redux store:
```
  import ChatMessages from './features/ChatMessage'; // The above example file
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

    const closeAlerts = () => {
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
          <p style={{color: 'red'}} onClick={closeAlerts}>
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
```

## Records
Each ReduxRESTClient internaly stores an array of records (such as rows from a database) returned from the REST API.
Each record must be unique by the field "_id". The "_id" is used to update records of the same "_id".
Records are plain javascript objects.

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
| `path` | (OPTIONAL) defaults to the lower-cased resourceName (first constructor arg), customizes the base path for the REST API default: "/<ResourceName>". |
| `fetchFunction` | (OPTIONAL) a function that will be called instead of directly calling window.fetch(). Use this to customize how requests are performed in your app. Defaults to (url, options) => window.fetch(url, options). |
| `idField` | (OPTIONAL) Used to specify which field/property records should be unique by (for merging and sorting). Default: '_id' |

### Actions

NOTE: The below action methods create and return action. The action must then be dispatched, in order to be executed.

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
| `clearRequest(requestType)` | Returns an action that would clear the request status. This is done automatically starting a new request automatically.  |


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

### Sorting
The list of records inside each rest client are sorted by _id by default. In ascending order (larger _id later in the array).
You can customize the order of records are stored by using setSortFunction(function).

The default sort function is:
```
function(rec1, rec2) {
  // Sort by id by default
  if (rec1._id < rec2._id) return -1;
  if (rec1._id > rec2._id) return 1;
  return 0;
}
```
