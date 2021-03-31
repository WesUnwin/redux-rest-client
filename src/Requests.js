class Requests {
  static fetchFunction = Requests.defaultFetchFunction;

  static doRequest(method = 'GET', url = '/', params = {}, requestOptions = { json: true }, headers = {}) {
    const options = {
      method: method,
      headers: headers,
      credentials: 'same-origin'
    };

    if (requestOptions.json) options.headers['Content-Type'] = 'application/json';

    if (method == 'GET') {
      const queryString = Object.keys(params).map((key) => {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
      }).join('&');

      url = `${url}?${queryString}`;
    } else {
      options.body = JSON.stringify(params);
    }

    return Requests.fetchFunction(url, options);
  }

  static defaultFetchFunction(url, options) {
    return window.fetch(url, options);
  }
}

export default Requests;