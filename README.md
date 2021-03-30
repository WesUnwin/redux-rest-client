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

## Setting Up Your RecordSets
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

1. Send requests to your REST APIs, via create()/read()/update()/delete() CRUD actions
2. Read the list of records stored in the slice via a variety of selctors (eg. getAll() get(id), where(...))

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
        <button onClick={onClick}>Send Chat Message</button>
      </div>
    );
  }
```
