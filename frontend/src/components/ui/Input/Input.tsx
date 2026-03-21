import * as React from 'react';
import clsx from 'clsx';
import styles from './Input.module.css';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input type={type} data-slot="input" className={clsx(styles.input, className)} {...props} />
  );
}

export { Input };
