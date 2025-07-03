import '../styles/globals.css';
import { CanvasProvider } from '../components/canvas/CanvasProvider';

export default function MyApp({ Component, pageProps }) {
  return (
    <CanvasProvider>
      <Component {...pageProps} />
    </CanvasProvider>
  );
}
