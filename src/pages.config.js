import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import Dashboard from './pages/Dashboard';
import Drawings from './pages/Drawings';
import Financials from './pages/Financials';
import Projects from './pages/Projects';
import RFIs from './pages/RFIs';
import Resources from './pages/Resources';
import Insights from './pages/Insights';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "Dashboard": Dashboard,
    "Drawings": Drawings,
    "Financials": Financials,
    "Projects": Projects,
    "RFIs": RFIs,
    "Resources": Resources,
    "Insights": Insights,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};