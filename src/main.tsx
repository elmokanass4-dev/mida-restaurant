import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import DemoApp from './DemoApp';
import {demoEnabled} from './services/api';
import './index.css';

createRoot(document.getElementById('root')!).render(demoEnabled?<DemoApp/>:<App />);
