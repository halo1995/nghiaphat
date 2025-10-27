package com.brostech.transport.common.factory;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.slf4j.Marker;

import java.util.HashMap;
import java.util.Map;

import static com.brostech.transport.common.factory.MaskingUtils.maskingSensitiveData;
import static com.brostech.transport.common.factory.MaskingUtils.setParamToMap;

public class LoggingFactory implements Logger {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public static final String TYPE = "type";

    private final Logger logger;

    private LoggingFactory(Class<?> clazz) {
        logger = LoggerFactory.getLogger(clazz);
    }

    public static Logger getLogger(Class<?> clazz) {
        return new LoggingFactory(clazz);
    }

    @Override
    public String getName() {
        return logger.getName();
    }

    @Override
    public boolean isTraceEnabled() {
        return logger.isTraceEnabled();
    }

    @Override
    public void trace(String s) {
        if (logger.isTraceEnabled()) {
            logger.trace(s);
        }

    }

    @Override
    public void trace(String s, Object o) {
        var contextMap = getMDCContext();
        if (logger.isTraceEnabled()) {
            try {
                o = maskingSensitiveData(o);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.trace(s, o);
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void trace(String s, Object o, Object o1) {
        var contextMap = getMDCContext();
        if (logger.isTraceEnabled()) {
            try {
                o = maskingSensitiveData(o);
                o1 = maskingSensitiveData(o1);
                if (o != null && contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o, o1)));
                    MDC.setContextMap(contextMapClone);

                }
                logger.trace(s, o, o1);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void trace(String s, Object... objects) {
        var contextMap = getMDCContext();
        if (logger.isTraceEnabled()) {
            try {
                objects = maskingSensitiveData(objects);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(objects)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.trace(s, objects);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void trace(String s, Throwable throwable) {
        if (logger.isTraceEnabled()) {
            logger.trace(s, throwable);
        }

    }

    @Override
    public boolean isTraceEnabled(Marker marker) {
        return logger.isTraceEnabled(marker);
    }

    @Override
    public void trace(Marker marker, String s) {
        logger.trace(marker, s);
    }

    @Override
    public void trace(Marker marker, String s, Object o) {
        logger.trace(marker, s, o);
    }

    @Override
    public void trace(Marker marker, String s, Object o, Object o1) {
        logger.trace(marker, s, o, o1);
    }

    @Override
    public void trace(Marker marker, String s, Object... objects) {
        logger.trace(marker, s, objects);
    }

    @Override
    public void trace(Marker marker, String s, Throwable throwable) {
        logger.trace(marker, s, throwable);
    }

    @Override
    public boolean isDebugEnabled() {
        return logger.isDebugEnabled();
    }

    @Override
    public void debug(String s) {
        if (logger.isDebugEnabled()) {
            logger.debug(s);
        }
    }

    @Override
    public void debug(String s, Object o) {
        var contextMap = getMDCContext();
        if (logger.isDebugEnabled()) {
            try {
                o = maskingSensitiveData(o);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.debug(s, o);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void debug(String s, Object o, Object o1) {
        var contextMap = getMDCContext();
        if (logger.isDebugEnabled()) {
            try {
                o = maskingSensitiveData(o);
                o1 = maskingSensitiveData(o1);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o, o1)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.debug(s, o, o1);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void debug(String s, Object... objects) {
        var contextMap = getMDCContext();
        if (logger.isDebugEnabled()) {
            try {
                objects = maskingSensitiveData(objects);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(objects)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.debug(s, objects);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void debug(String s, Throwable throwable) {
        if (logger.isDebugEnabled()) {
            logger.debug(s, throwable);
        }

    }

    @Override
    public boolean isDebugEnabled(Marker marker) {
        return logger.isDebugEnabled(marker);
    }

    @Override
    public void debug(Marker marker, String s) {
        logger.debug(marker, s);
    }

    @Override
    public void debug(Marker marker, String s, Object o) {
        logger.debug(marker, s, o);
    }

    @Override
    public void debug(Marker marker, String s, Object o, Object o1) {
        logger.debug(marker, s, o, o1);
    }

    @Override
    public void debug(Marker marker, String s, Object... objects) {
        logger.debug(marker, s, objects);
    }

    @Override
    public void debug(Marker marker, String s, Throwable throwable) {
        logger.debug(marker, s, throwable);
    }

    @Override
    public boolean isInfoEnabled() {
        return logger.isInfoEnabled();
    }

    @Override
    public void info(String s) {
        if (logger.isInfoEnabled()) {
            logger.info(s);
        }
    }

    @Override
    public void info(String s, Object o) {
        var contextMap = getMDCContext();
        if (logger.isInfoEnabled()) {
            try {
                o = maskingSensitiveData(o);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.info(s, o);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void info(String s, Object o, Object o1) {
        var contextMap = getMDCContext();
        if (logger.isInfoEnabled()) {
            try {
                o = maskingSensitiveData(o);
                o1 = maskingSensitiveData(o1);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o, o1)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.info(s, o, o1);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void info(String s, Object... objects) {
        var contextMap = getMDCContext();
        if (logger.isInfoEnabled()) {
            try {
                objects = maskingSensitiveData(objects);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(objects)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.info(s, objects);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void info(String s, Throwable throwable) {
        if (logger.isInfoEnabled()) {
            logger.info(s, throwable);
        }
    }

    @Override
    public boolean isInfoEnabled(Marker marker) {
        return false;
    }

    @Override
    public void info(Marker marker, String s) {
        logger.info(s, s);
    }

    @Override
    public void info(Marker marker, String s, Object o) {
        logger.info(marker, s, o);
    }

    @Override
    public void info(Marker marker, String s, Object o, Object o1) {
        logger.info(marker, s, o, o1);
    }

    @Override
    public void info(Marker marker, String s, Object... objects) {
        logger.info(marker, s, objects);
    }

    @Override
    public void info(Marker marker, String s, Throwable throwable) {
        logger.info(marker, s, throwable);
    }

    @Override
    public boolean isWarnEnabled() {
        return logger.isWarnEnabled();
    }

    @Override
    public void warn(String s) {
        if (logger.isWarnEnabled()) {
            logger.warn(s);
        }
    }

    @Override
    public void warn(String s, Object o) {
        var contextMap = getMDCContext();
        if (logger.isWarnEnabled()) {
            try {
                o = maskingSensitiveData(o);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.warn(s, o);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void warn(String s, Object... objects) {
        var contextMap = getMDCContext();
        if (logger.isWarnEnabled()) {
            try {
                objects = maskingSensitiveData(objects);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(objects)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.warn(s, objects);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void warn(String s, Object o, Object o1) {
        var contextMap = getMDCContext();
        if (logger.isWarnEnabled()) {
            try {
                o = maskingSensitiveData(o);
                o1 = maskingSensitiveData(o1);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o, o1)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.warn(s, o, o1);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void warn(String s, Throwable throwable) {
        if (logger.isWarnEnabled()) {
            logger.warn(s, throwable);
        }
    }

    @Override
    public boolean isWarnEnabled(Marker marker) {
        return logger.isWarnEnabled(marker);
    }

    @Override
    public void warn(Marker marker, String s) {
        logger.warn(marker, s);
    }

    @Override
    public void warn(Marker marker, String s, Object o) {
        logger.warn(marker, s, o);
    }

    @Override
    public void warn(Marker marker, String s, Object o, Object o1) {
        logger.warn(marker, s, o, o1);
    }

    @Override
    public void warn(Marker marker, String s, Object... objects) {
        logger.warn(marker, s, objects);
    }

    @Override
    public void warn(Marker marker, String s, Throwable throwable) {
        logger.warn(marker, s, throwable);
    }

    @Override
    public boolean isErrorEnabled() {
        return logger.isErrorEnabled();
    }

    @Override
    public void error(String s) {
        if (logger.isErrorEnabled()) {
            logger.error(s);
        }
    }

    @Override
    public void error(String s, Object o) {
        var contextMap = getMDCContext();
        if (logger.isErrorEnabled()) {
            try {
                o = maskingSensitiveData(o);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.error(s, o);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void error(String s, Object o, Object o1) {
        var contextMap = getMDCContext();
        if (logger.isErrorEnabled()) {
            try {
                o = maskingSensitiveData(o);
                o1 = maskingSensitiveData(o1);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(o, o1)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.error(s, o, o1);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void error(String s, Object... objects) {
        var contextMap = getMDCContext();
        if (logger.isErrorEnabled()) {
            try {
                objects = maskingSensitiveData(objects);
                if (contextMap != null) {
                    var contextMapClone = new HashMap<>(contextMap);
                    contextMapClone.put("data", OBJECT_MAPPER.writeValueAsString(setParamToMap(objects)));
                    MDC.setContextMap(contextMapClone);
                }
                logger.error(s, objects);
            } catch (Exception e) {
                // no thing
            } finally {
                MDC.setContextMap(contextMap);
            }
        }
    }

    @Override
    public void error(String s, Throwable throwable) {
        if (logger.isErrorEnabled()) {
            logger.error(s, throwable);
        }
    }

    @Override
    public boolean isErrorEnabled(Marker marker) {
        return logger.isErrorEnabled(marker);
    }

    @Override
    public void error(Marker marker, String s) {
        logger.error(marker, s);
    }

    @Override
    public void error(Marker marker, String s, Object o) {
        logger.error(marker, s, o);
    }

    @Override
    public void error(Marker marker, String s, Object o, Object o1) {
        logger.error(marker, s, o, o1);
    }

    @Override
    public void error(Marker marker, String s, Object... objects) {
        logger.error(marker, s, objects);
    }

    @Override
    public void error(Marker marker, String s, Throwable throwable) {
        logger.error(marker, s, throwable);
    }

    private static Map<String, String> getMDCContext() {
        var contextMap = MDC.getCopyOfContextMap();
        if (contextMap != null) {
            var mcType = contextMap.get(TYPE);
            if (StringUtils.isBlank(mcType)) {
                contextMap.put(TYPE, "LOGIC");
            }
        }
        return contextMap;
    }

}
