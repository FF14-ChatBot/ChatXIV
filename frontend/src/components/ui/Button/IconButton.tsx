import { forwardRef } from 'react';
import { Button, type ButtonBaseProps } from './Button';

type IconButtonProps = Omit<ButtonBaseProps, 'size'>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => (
  <Button ref={ref} size="icon" {...props} />
));

IconButton.displayName = 'IconButton';
