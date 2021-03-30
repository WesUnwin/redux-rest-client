# redux-rest-client
A REST API client library for use with redux.
This library allows you to setup CRUD actions &amp; reducers to interact with REST APIs,
and uses redux to store a slice containing a list of records returned from a REST API.

Records are storred in a redux slice (using Redux's createSlice()).

This library internally uses window.fetch() to send requests to a given REST API.

## Installation
```
npm install --save react-rest-client
```

## Setting Up Your RecordSet(s)
To use this libary simply import RecordSet (default export of this package) and begin creating sub-classes that configure
the necessary REST resources for using your system's REST APIs.

Sub-class this to define a new type of resource. createSlice() which you must pass in from the redux library will
be used to setup a slice containing CRUD actions & reducers, necessary to manage a _list of records in the redux slice.

EXAMPLE: ChatMessages.js  (Inside your app)
```
import RecordSet from 'redux-rest-client';
import { createSlice, createSelector } from '@reduxjs/toolkit';

class ChatMessages extends RecordSet {
  constructor() {
    super('chatMessages', { api: 'chat_messages', createSlice: createSlice, createSelector: createSelector });
  }
}
     
export default ChatMessages;
```

## Adding to Your Redux Store
You must then add the reducer for the above subclass to your Redux store:
```
  import ChatMessages from './feaures/ChatMessage'; // The above example file
  import { configureStore } from '@reduxjs/toolkit';
  
  const store = configureStore({
    reducer: {
      chatMessages: ChatMessages.getReducer()
      ...
    }
  });

  export default store;
```

## Using Your RecordSet(s)
Each sub-class of RecordSet that you create and add to your store can they be used to:

1. Send requests to your REST APIs, via CRUD actions (create()/read()/update()/delete())
2. Read the list of records stored in the slice via a variety of selectors (eg. getAll() get(id), where(...))

```
  import ChatMessages from './features/ChatMessages';
  import { useDispatch, useSelector } from 'react-redux';

  // A React JS component that makes use of the ChatMessages RecordSet.
  const ChatMessages = () => {
    const dispatch = useDispatch();
    const messages = useSelector(ChatMessages.getAll());

    const onClick = {
      dispatch(ChatMessages.create({ text: "Hello World!" }));
    };

    return (
      <div>
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

## RecordSet API
Your subclass will inherit actions - function that can be used to send requests to the associated REST API,
and selectors that can be used read the list of records and hook components into re-rendering when needed.

### Actions

| Method | Description |
| --- | --- |
| `create({ params })` | Sends a POST request to /api/<resourceName> and stores the server's response in a record. |
| `fetch({ params })` | Sends a GET request to /api/<resourceName> and stores the array of records returned by the server inside the slice. |
| `fetchById(id)` | Sends a GET request to /api/<resourceName>/id and stores the single record returned by the server inside the slice. |
| `update({ params })` | Sends a PUT request to /api/<resourceName> and creates/updates a record in the slice using the server's response. |
| `delete({ params })` | Sends a DELETE request to /api/<resourceName> then removes the record with the given _id from the list of records. |

### Selectors

| Method | Description |
| --- | --- |
| `isLoaded()` | Returns true if the slice has been populated once or more with records (elsewise returns false). |
| `getAll()` | Return a selector that will return the entire array of records inside. |
| `fetch({ params })` | Sends a GET request to /api/<resourceName> and stores the array of records returned by the server inside the slice, merging with any existing records. |
| `get(id)` | Returns a selector that will return the individual record (an object) with the specified id. |
| `where(conditions)` | Returns a selector that returns all records matching the given conditions given as an object of key/value pairs eg. { attribute1: 'value1, ... }. |
| `findBy(conditions)` | Same as where() but will return just the first matching record. |
