import { createRoot } from 'react-dom/client';
import { Application } from '../../src/react/application';
import { ApplicationServices } from '../../src/react/services/application';
import { captureShareEntry } from '../../src/app/core/share-entry';
import '../../src/styles.css';

captureShareEntry(window.location.href);
const services = new ApplicationServices(localStorage, {});
const session = services.createCalculator();
createRoot(document.querySelector('app-root')!).render(<Application services={services} session={session} />);
window.addEventListener('pagehide', () => services.dispose(), { once: true });
