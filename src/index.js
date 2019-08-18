import React from 'react';
import isEqual from 'react-fast-compare';

const isObject = obj => obj !== null && typeof obj === 'object';
const isFunction = obj => typeof obj === 'function';
const isPromise = value => isObject(value) && isFunction(value.then);
const noop = () => {};

const useForm = ({
  initialValues: iv = {},
  onSubmit = noop,
  validate = noop,
  validateOnChange = true,
  validateOnBlur = true,
}) => {
  const isMounted = React.useRef(false);
  const initialValues = React.useRef(iv);
  const [state, setState] = React.useReducer(
    (previousState, newState) => ({ ...previousState, ...newState }),
    {
      values: iv,
      errors: {},
      touched: {},
    }
  );

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
    values => {
      runAllValidations(values).then(combinedErrors => {
        if (!!isMounted.current) {
          if (!isEqual(state.errors, combinedErrors)) {
            setState({ errors: combinedErrors });
          }
        }
      });
    },
    [runAllValidations, state.values]
  );

  const executeSubmit = useEventCallback(() => onSubmit(state.values), [
    onSubmit,
    state.values,
  ]);

  const submitForm = useEventCallback(() => {
    return runAllValidations(state.values).then(combinedErrors => {
      const isActuallyValid = Object.keys(combinedErrors).length === 0;
      if (isActuallyValid) {
        return Promise.resolve(executeSubmit())
          .then(() => {
            console.log('Submit success');
          })
          .catch(errors => {
            console.log('Submit failure');
            throw errors;
          });
      } else if (!!isMounted.current) {
        console.error('There was a problem with submitting the form');
        return;
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

      submitForm(state.values);
    },
    [submitForm]
  );

  const setFieldValue = useEventCallback(
    (name, value) => {
      const newValues = {
        ...state.values,
        [name]: value,
      };
      setState({
        values: newValues,
      });
      return validateOnChange ? validateForm(newValues) : Promise.resolve();
    },
    [validateForm, state.values, validateOnChange]
  );

  const setFieldTouched = useEventCallback(
    (name, touched = true) => {
      setState({
        touched: {
          ...state.touched,
          [name]: touched,
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

  const dirty = React.useMemo(
    () => !isEqual(initialValues.current, state.values),
    [state.values]
  );

  const isValid = React.useMemo(
    () =>
      dirty ? state.errors && Object.keys(state.errors).length === 0 : false,
    [dirty, state.errors]
  );

  const reset = React.useCallback(event => {
    if (event && event.preventDefault && isFunction(event.preventDefault)) {
      event.preventDefault();
    }

    if (event && event.stopPropagation && isFunction(event.stopPropagation)) {
      event.stopPropagation();
    }

    setState({
      values: initialValues.current,
      errors: {},
      touched: {},
    });
  }, []);

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
    reset,
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
