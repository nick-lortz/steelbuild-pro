import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CostCodes from './pages/CostCodes';
import Financials from './pages/Financials';
import Drawings from './pages/Drawings';
import RFIs from './pages/RFIs';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Projects": Projects,
    "CostCodes": CostCodes,
    "Financials": Financials,
    "Drawings": Drawings,
    "RFIs": RFIs,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};