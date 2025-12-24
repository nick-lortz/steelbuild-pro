import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CostCodes from './pages/CostCodes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Projects": Projects,
    "CostCodes": CostCodes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};