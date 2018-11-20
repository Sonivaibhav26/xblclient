const Axios = require('axios')
  , methodWithNodata = ['delete', 'get', 'head', 'options']
  , methodWithData = ['post', 'put', 'patch'];

const getMethodWrapper = (methodName, client, lco, logger) => {
  if (methodWithNodata.indexOf(methodName) > -1) {
    return (...params) => {
      if (!params[1] || Object.keys(params[1] < 1))
        params[1] = {};
      params[1].lco = lco;
      params[1].logger = logger;
      return client[methodName](...params);
    }
  }
  else if (methodWithData.indexOf(methodName) > -1) {
    return (...params) => {
      if (!params[2] || Object.keys(params[1] < 1))
        params[2] = {};
      params[2].lco = lco;
      params[2].logger = logger;
      return client[methodName](...params);
    }
  }
  else {
    return (...params) => {
      return client[methodName](...params);
    }
  }
};

const addHeadersAndLog = (config) => {
  config.headers.coid = config.lco.coid;
  config.headers.copath = config.lco.copath;
  const util = config.logger.util();
  const logger = config.logger.logger();
  config.name = config.lco.copath;
  config.lco = util.createCoInstance(config);
  logger(config.lco).info("Request Initiated");
  return {
    ...config
  }
}

module.exports = {
  create: (_logger, _options = {}) => {
    const logger = _logger
      , util = logger.util()
      , client = Axios.create(_options);

    client.interceptors.request.use(addHeadersAndLog);

    return (lco) => {
      if (!util.verifyCorelation(lco)) {
        throw Error('not a valid Corelation logger object');
      }
      return Object
        .keys(client)
        .reduce((result, key) => ({
          ...result,
          ...{
            [key]: getMethodWrapper(key, client, lco, logger)
          }
        }), {});
    }
  }

}

