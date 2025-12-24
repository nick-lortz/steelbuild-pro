import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CostCodes from './pages/CostCodes';
import Financials from './pages/Financials';
import Drawings from './pages/Drawings';
import RFIs from './pages/RFIs';
import ChangeOrders from './pages/ChangeOrders';
import Resources from './pages/Resources';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Projects": Projects,
    "CostCodes": CostCodes,
    "Financials": Financials,
    "Drawings": Drawings,
    "RFIs": RFIs,
    "ChangeOrders": ChangeOrders,
    "Resources": Resources,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};