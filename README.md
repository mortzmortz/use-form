<h1 align="center">
  use-form
</h1>

<details>
<summary>📖 Table of Contents</summary>
<p>

- [Getting Started](#getting-started)
- [Examples](#examples)
  - [Basic Usage](#basic-usage)
- [API](#api)
  - [Imperative Methods](#imperative-methods)
    - [`setFieldValue` and `setFieldTouched`](#setfieldvalue-and-setfieldtouched)
    - [`reset`](#reset)
- [License](#license)

</p>
</details>

## Getting Started

To get it started, add `use-form` to your project:

```
npm install --save use-form
```

Please note that `use-form` requires `react@^16.8.0` as a peer dependency.

## Examples

### Basic Usage

```jsx
import useForm from 'useForm';

function Form() {
  const onSubmit = values => {
    // do something values
  };

  const validate = ({ email }) => {
    let errors = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (
      email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)
    ) {
      errors.email = 'Invalid email address';
    }

    return errors;
  };

  const {
    values,
    handleChange,
    handleBlur,
    handleSubmit,
    errors,
  } = useForm({
    initialValues: {
      email: '',
    },
    onSubmit,
    validate,
  });

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Enter your email"
        type="email"
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.email && (<p>{errors.email}</p>)}
      <button type="submit">
        Submit
      </button>
    </form>
  );
}
```

## API

```js
import useForm from 'use-form';

function Form() {
  const {
    values,
    handleChange,
    handleBlur,
    handleSubmit,
    dirty,
    isValid,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
  } = useForm({
    initialValues: {},
    onSubmit: values => {},
    validate: values => {},
    validateOnChange: true,
    validateOnBlur: true,
  });
}
```

### Imperative Methods
There are cases where you may want to update the value of an input manually because they are not working with Reacts's [Synthetic Event](https://reactjs.org/docs/events.html). For example, controls like [react-select](https://react-select.com/home) or [react-datepicker](https://www.npmjs.com/package/react-datepicker) have `onChange` and `value` props that expect a custom value instead of an event.

`useForm` provides imperative update methods for handling these controls.

#### `setFieldValue` and `setFieldTouched`
```js
import DatePicker from "react-datepicker";

function DateSelect() {
  const {
    values,
    setFieldValue,
  } = useForm({
    initialValues: {
      date: new Date(),
    }
  });

  return (
    <DatePicker
      selected={values.date}
      onChange={value => setFieldValue('date', value)}
      onBlur={() => setFieldTouched('date')}
    />
  );
}
```

#### `reset`
The form state can be reset back to its initial state if provided at any time using `reset`.
```js
function Form() {
  const {
    values,
    handleChange
    reset,
  } = useForm({
    initialValues: {
      text: 'Initial value',
    }
  });

  return (
    <React.Fragment>
      <input
        type="text"
        name="text"
        value={values.text}
        onChange={handleChange}
      />
      <button onClick={reset}>Reset to Initial State</button>
    </React.Fragment>
  );
}
```

## License

MIT
