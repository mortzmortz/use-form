import useForm from './';
import { renderHook, act } from '@testing-library/react-hooks';

// TODO: test options:
// https://github.com/wsmd/react-use-form-state/blob/master/test/useFormState-formOptions.test.js

describe('useForm API', () => {
  it('returns the expected object', () => {
    const { result } = renderHook(() => useForm());
    expect(result.current).toEqual({
      values: {},
      isValid: false,
      dirty: false,
      touched: {},
      errors: {},
      reset: expect.any(Function),
      setFieldValue: expect.any(Function),
      setFieldTouched: expect.any(Function),
      handleSubmit: expect.any(Function),
      handleChange: expect.any(Function),
      handleBlur: expect.any(Function),
      isSubmitting: false,
    });
  });

  it('sets initial values for inputs', () => {
    const initialValues = {
      name: 'Karsten Stahl',
      email: 'karsten@stahl.com',
    };
    const { result } = renderHook(() => useForm({ initialValues }));
    const { values } = result.current;
    expect(values).toEqual(expect.objectContaining(initialValues));
  });

  it('imperative method `setFieldValue` updates values object', () => {
    const initialValues = {
      name: 'Karsten Stahl',
    };
    const { result } = renderHook(() => useForm({ initialValues }));

    act(() => {
      result.current.setFieldValue('name', 'Rüdiger Messing');
    });

    expect(result.current.values).toEqual({
      name: 'Rüdiger Messing',
    });
  });

  it('imperative method `setFieldTouched` updates touched object', () => {
    const { result } = renderHook(() => useForm());

    act(() => {
      result.current.setFieldTouched('name');
    });

    expect(result.current.touched).toEqual({
      name: true,
    });
  });

  it('reset method sets values to its initial state', () => {
    const initialValues = {
      name: 'Karsten Stahl',
    };
    const { result } = renderHook(() => useForm({ initialValues }));

    act(() => {
      result.current.setFieldValue('name', 'Rüdiger Messing');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual({
      name: 'Karsten Stahl',
    });
  });
});
