import { Provider } from "@snippets/provider"
import { createRoot } from 'react-dom/client'
import App from '../App'

createRoot(document.getElementById('root')!).render(
    <Provider>
      <App />
    </Provider>
)
