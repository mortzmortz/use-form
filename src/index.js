import React from 'react';
import isEqual from 'react-fast-compare';

const isObject = obj => obj !== null && typeof obj === 'object';
const isFunction = obj => typeof obj === 'function';
const isPromise = value => isObject(value) && isFunction(value.then);
const noop = () => {};
const setObjectValues = (
  obj,
  value,
  visited = new WeakMap(),
  response = {}
) => {
  for (let k of Object.keys(obj)) {
    const val = obj[k];
    if (isObject(val)) {
      if (!visited.get(val)) {
        visited.set(val, true);
        // In order to keep array values consistent for both dot path  and
        // bracket syntax, we need to check if this is an array so that
        // this will output  { friends: [true] } and not { friends: { "0": true } }
        response[k] = Array.isArray(val) ? [] : {};
        setObjectValues(val, value, visited, response[k]);
      }
    } else {
      response[k] = value;
    }
  }

  return response;
};

const formReducer = (state = {}, action) => {
  switch (action.type) {
    case 'SET_VALUES':
      return {
        ...state,
        values: action.payload,
      };
    case 'SET_TOUCHED':
      return {
        ...state,
        touched: action.payload,
      };
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.payload,
      };
    case 'SET_FIELD_VALUE':
      return {
        ...state,
        values: {
          ...state.values,
          [action.payload.name]: action.payload.value,
        },
      };
    case 'SET_FIELD_TOUCHED':
      return {
        ...state,
        touched: {
          ...state.touched,
          [action.payload.name]: action.payload.value,
        },
      };
    case 'SET_FIELD_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.name]: action.payload.value,
        },
      };
    case 'RESET_FORM':
      return {
        ...state,
        ...action.payload,
      };
    default: {
      throw new Error(`Unsupported action type: ${action.type}`);
    }
  }
};

const useForm = ({
  initialValues = {},
  onSubmit = noop,
  validate = noop,
  validateOnChange = true,
  validateOnBlur = true,
} = {}) => {
  const isMounted = React.useRef(false);
  const [state, dispatch] = React.useReducer(formReducer, {
    values: initialValues,
    errors: {},
    touched: {},
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const runValidateHandler = React.useCallback(
    values =>
      new Promise((resolve, reject) => {
        const maybePromisedErrors = validate(values);
        if (maybePromisedErrors == null) {
          // use loose null check here on purpose
          resolve({});
        } else if (isPromise(maybePromisedErrors)) {
          maybePromisedErrors.then(
            errors => {
              resolve(errors || {});
            },
            actualException => {
              if (process.env.NODE_ENV !== 'production') {
                console.warn(
                  `Warning: An unhandled error was caught during validation in useForm({ validate })`,
                  actualException
                );
              }
              reject(actualException);
            }
          );
        } else {
          resolve(maybePromisedErrors);
        }
      }),
    [validate]
  );

  const runAllValidations = React.useCallback(
    values => (validate ? runValidateHandler(values) : {}),
    [runValidateHandler, validate]
  );

  const validateForm = useEventCallback(
    (values = state.values) => {
      runAllValidations(values).then(combinedErrors => {
        if (!!isMounted.current) {
          if (!isEqual(state.errors, combinedErrors)) {
            dispatch({ type: 'SET_ERRORS', payload: combinedErrors });
          }
        }
      });
    },
    [runAllValidations, state.values]
  );

  const executeSubmit = useEventCallback(() => onSubmit(state.values, reset), [
    onSubmit,
    state.values,
  ]);

  const submitForm = useEventCallback(() => {
    setIsSubmitting(true);
    // Set all fields as touched because we want to validate also untouched fields
    dispatch({
      type: 'SET_TOUCHED',
      payload: setObjectValues(state.values, true),
    });
    return runAllValidations(state.values).then(combinedErrors => {
      const isActuallyValid = Object.keys(combinedErrors).length === 0;
      if (isActuallyValid) {
        return Promise.resolve(executeSubmit())
          .then(() => {
            setIsSubmitting(false);
            return Promise.resolve(false);
          })
          .catch(errors => {
            setIsSubmitting(false);
            throw errors;
          });
      } else if (!!isMounted.current) {
        dispatch({ type: 'SET_ERRORS', payload: combinedErrors });
        return Promise.resolve(combinedErrors);
      }
      return;
    });
  }, [executeSubmit, runAllValidations]);

  const handleSubmit = useEventCallback(
    event => {
      if (event && event.preventDefault && isFunction(event.preventDefault)) {
        event.preventDefault();
      }
      if (event && event.stopPropagation && isFunction(event.stopPropagation)) {
        event.stopPropagation();
      }

      return submitForm(state.values);
    },
    [submitForm]
  );

  const setFieldValue = useEventCallback(
    (name, value) => {
      if (isEqual(value, state.values[name])) return;

      // We want to validate with the fresh values
      const newValues = {
        ...state.values,
        [name]: value,
      };
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: {
          name,
          value,
        },
      });
      return validateOnChange ? validateForm(newValues) : Promise.resolve();
    },
    [validateForm, state.values, validateOnChange]
  );

  const setFieldTouched = useEventCallback(
    (name, touched = true) => {
      dispatch({
        type: 'SET_FIELD_TOUCHED',
        payload: {
          name,
          value: touched,
        },
      });
      return validateOnBlur ? validateForm(state.values) : Promise.resolve();
    },
    [validateForm, state.values, validateOnBlur]
  );

  const handleBlur = event => {
    if (event.persist) {
      event.persist();
    }

    const {
      target: { name, id, outerHTML },
    } = event;
    const field = name ? name : id;

    if (!field && process.env.NODE_ENV !== 'production') {
      warnAboutMissingIdentifier({
        htmlContent: outerHTML,
        handlerName: 'handleChange',
      });
    }

    setFieldTouched(name, true);
  };

  const handleChange = React.useCallback(
    event => {
      if (event.persist) {
        event.persist();
      }

      const {
        target: { type, checked, name, value, id, outerHTML },
      } = event;
      const newValue = type === 'checkbox' ? checked : value;

      const field = name ? name : id;

      if (!field && process.env.NODE_ENV !== 'production') {
        warnAboutMissingIdentifier({
          htmlContent: outerHTML,
          handlerName: 'handleChange',
        });
      }

      setFieldValue(name, newValue);
    },
    [setFieldValue]
  );

  const dirty = React.useMemo(() => !isEqual(initialValues, state.values), [
    initialValues,
    state.values,
  ]);

  const isValid = React.useMemo(
    () =>
      dirty ? state.errors && Object.keys(state.errors).length === 0 : false,
    [dirty, state.errors]
  );

  const reset = React.useCallback(
    event => {
      if (event && event.preventDefault && isFunction(event.preventDefault)) {
        event.preventDefault();
      }

      if (event && event.stopPropagation && isFunction(event.stopPropagation)) {
        event.stopPropagation();
      }

      dispatch({
        type: 'RESET_FORM',
        payload: {
          values: initialValues,
          errors: {},
          touched: {},
        },
      });
    },
    [initialValues]
  );

  const setValues = useEventCallback(values =>
    dispatch({ type: 'SET_VALUES', payload: values })
  );

  return {
    handleSubmit,
    handleChange,
    handleBlur,
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    dirty,
    isValid,
    setFieldValue,
    setFieldTouched,
    setValues,
    reset,
    isSubmitting,
  };
};

function warnAboutMissingIdentifier({ htmlContent, handlerName }) {
  console.warn(
    `Warning: useForm called \`${handlerName}\`, but you forgot to pass an \`id\` or \`name\` attribute to your input:
    ${htmlContent}
    useForm cannot determine which value to update.
  `
  );
}

// NOTE: Gives us the current state without invalidating too often and
// let us do side effects
// https://github.com/facebook/react/issues/14099#issuecomment-440013892
// but have in mind: https://github.com/facebook/react/issues/14092#issuecomment-435907249
function useEventCallback(fn) {
  let ref = React.useRef();
  React.useLayoutEffect(() => {
    ref.current = fn;
  });
  return React.useCallback((...args) => (0, ref.current)(...args), []);
}

export default useForm;
