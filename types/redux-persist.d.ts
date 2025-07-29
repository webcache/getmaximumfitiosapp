declare module 'redux-persist/integration/react' {
  import { ComponentType, ReactNode } from 'react';

  interface PersistGateProps {
    loading?: ReactNode;
    persistor: any;
    children?: ReactNode;
  }

  export const PersistGate: ComponentType<PersistGateProps>;
}
