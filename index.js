const Axios = require('axios')
  , { containValidOptionskey } = require('./util')
  , _ = require('lodash')
  , methodWithNodata = ['delete', 'get', 'head', 'options']
  , methodWithData = ['post', 'put', 'patch'];

const getMethodWrapper = (methodName, client, lco, logger) => {
  if (methodWithNodata.indexOf(methodName) > -1) {
    return (...params) => {
      let noOfArguments = params.length;
      if (noOfArguments === 0)
        noOfArguments = 1;
      if (typeof params[noOfArguments - 1] === "string" && noOfArguments - 1 === 1)
        noOfArguments += 1;
      if (!params[noOfArguments - 1] || Object.keys(params[noOfArguments - 1] < 1))
        params[noOfArguments - 1] = {};
      params[noOfArguments - 1].lco = lco;
      params[noOfArguments - 1].logger = logger;
      return client[methodName](...params);
    }
  }
  else if (methodWithData.indexOf(methodName) > -1) {
    return (...params) => {
      let optionsModified = false;
      params.splice(3);
      params
        .map((param) => {
          if (!optionsModified && typeof param === "object" && !_.isEmpty(param) && containValidOptionskey(Object.keys(param))) {
            param.lco = lco;
            param.logger = logger;
            optionsModified = true;
          }
          return param;
        });
      if (!optionsModified) {
        if (!params[2] || Object.keys(params[2] < 1))
          params[2] = {};
        params[2].lco = lco;
        params[2].logger = logger;
      }
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

const logResponse = ({ config, ...args }) => {
  const logger = config.logger.logger();
  logger(config.lco).info("Response Recieved");
  return {
    ...args,
    ...config
  }
}

module.exports = {
  create: (_logger, _options = {}) => {
    const logger = _logger
      , util = logger.util()
      , client = Axios.create(_options);
    client.interceptors.request.use(addHeadersAndLog);
    client.interceptors.response.use(logResponse);

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

