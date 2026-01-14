"use client";

import * as React from 'react';
import {useState} from 'react';
import {CSSObject, styled, Theme} from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, {AppBarProps as MuiAppBarProps} from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

import MediationIcon from '@mui/icons-material/Mediation';
import {Menu, MenuItem, Slider, Stack, Tooltip} from '@mui/material';
import Link from 'next/link';
import {Download, VolumeDown, VolumeUp} from "@mui/icons-material";
import AlarmAudio from "@/app/_components/AlarmAudio";
import {selectAlarmAudioVolume, setAlarmAudioVolume} from "@/lib/state/OSCARClientSlice";
import {useDispatch, useSelector} from "react-redux";
import { useBreakpoint } from '../providers';

const drawerWidth = 240;
const drawerWidthMobile = 200;

const openedMixin = (theme: Theme): CSSObject => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up('sm')]: {
        width: `calc(${theme.spacing(8)} + 1px)`,
    },
});

// Used to place content below the app bar
const DrawerHeader = styled('div')(({theme}) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
    open?: boolean;
    isDesktop?: boolean;
}

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open' && prop !== "isDesktop"
})<AppBarProps>(({theme, open, isDesktop}) => ({
    zIndex: theme.zIndex.drawer + 1,
    // Exit transition
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...((open && isDesktop) && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        // Entrance transition
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
    ...((open && !isDesktop) && {
        width: `calc(100% - ${drawerWidthMobile}px)`,
        // Entrance transition
        transition: theme.transitions.create(['transform'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const Drawer = styled(MuiDrawer, {shouldForwardProp: (prop) => prop !== 'open'})(
    ({theme, open}) => ({
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...(open && {
            ...openedMixin(theme),
            '& .MuiDrawer-paper': openedMixin(theme),
        }),
        ...(!open && {
            ...closedMixin(theme),
            '& .MuiDrawer-paper': closedMixin(theme),
        }),
    }),
);

export default function Navbar({children}: { children: React.ReactNode }) {
    const { isDesktop } = useBreakpoint();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // Anchor element for notification menu
    const menuOpen = Boolean(anchorEl); // Open state for notification menu
    const [drawerOpen, setDrawerOpen] = useState(false);  // Open state for navigation drawer

    const dispatch = useDispatch();


    const savedVolume = useSelector(selectAlarmAudioVolume);

    // Handle opening menu
    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    // Handle closing menu
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Handle opening drawer
    const handleDrawerOpen = () => {
        setDrawerOpen(true);
    };

    // Handle closing drawer
    const handleDrawerClose = () => {
        setDrawerOpen(false);
    };

    const [volumeValue, setVolumeValue] = useState(savedVolume);

    const handleVolumeChange = (event: Event, newValue: number | number[]) => {
        const volume = newValue as number;
        setVolumeValue(volume);
        dispatch(setAlarmAudioVolume(volume));
    };

    // Menu items for drawer
    const menuItems = [
        {
            title: "Dashboard",
            icon: <DashboardRoundedIcon/>,
            href: "/",
        },
        {
            title: "Events",
            icon: <WarningRoundedIcon/>,
            href: "/event-log",
        },
        {
            title: "Map",
            icon: <LocationOnRoundedIcon/>,
            href: "/map",
        },
        {
            title: "National",
            icon: <MediationIcon/>,
            href: "/national-view",
        },
        {
            title: "Report Generator",
            icon: <Download/>,
            href: "/report",
        },
    ]

    // Settings items for drawer
    const settingsItems = [
        {
            title: "Servers",
            icon: <CloudRoundedIcon/>,
            href: "/servers",
        }
    ]

    // Drawer contents used for permanent and temporary variant
    const drawerContent = (
        <>
            <DrawerHeader>
                <IconButton onClick={handleDrawerClose} aria-label="close drawer">
                    <ChevronLeftIcon/>
                </IconButton>
            </DrawerHeader>
            <Divider/>
            <List>
                {menuItems.map((item) => (
                    <Link href={item.href} passHref key={item.title} onClick={!isDesktop ? handleDrawerClose : null}>
                        <ListItem disablePadding sx={{display: 'block'}}>
                            <ListItemButton
                                sx={{
                                    minHeight: 48,
                                    justifyContent: drawerOpen ? 'initial' : 'center',
                                    px: 2.5,
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: drawerOpen ? 3 : 'auto',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.title} sx={{opacity: drawerOpen ? 1 : 0}}/>
                            </ListItemButton>
                        </ListItem>
                    </Link>
                ))}
            </List>
            <Divider/>
            <List>
                {settingsItems.map((item) => (
                    <Link href={item.href} passHref key={item.title}>
                        <ListItem disablePadding sx={{display: 'block'}}>
                            <ListItemButton
                                sx={{
                                    minHeight: 48,
                                    justifyContent: drawerOpen ? 'initial' : 'center',
                                    px: 2.5,
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: drawerOpen ? 3 : 'auto',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.title} sx={{opacity: drawerOpen ? 1 : 0}}/>
                            </ListItemButton>
                        </ListItem>
                    </Link>
                ))}
            </List>
            <Divider/>
        </>
    )

    return (
        <Box sx={{display: 'flex'}}>
            <CssBaseline/>
            <AppBar
                position="fixed"
                open={drawerOpen}
                elevation={0}
                sx={{
                    backgroundColor: "background.default",
                    color: "text.primary",
                    borderBottom: "solid",
                    borderColor: "action.selected"
                }}
                isDesktop={isDesktop}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerOpen}
                        edge="start"
                        sx={{
                            marginRight: 5,
                            ...(drawerOpen && {display: 'none'}),
                        }}
                    >
                        <MenuIcon/>
                    </IconButton>
                    <Stack direction={"row"} width={"100%"} alignItems={"center"} justifyContent={"space-between"}>
                        <Typography variant="h6" noWrap component="div">
                            OSCAR
                        </Typography>
                        <Tooltip title={'Alarm Volume'} arrow placement="top">
                            <IconButton
                                color="inherit"
                                aria-label="open notifications"
                                onClick={handleMenuOpen}
                            >
                                {savedVolume === 0 ? <NotificationsOffIcon/> : <NotificationsRoundedIcon/>}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Toolbar>
            </AppBar>
            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem>
                    <Box sx={{ width: 200, padding: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            Alarm Volume
                        </Typography>

                        <Stack spacing={2} direction="row" sx={{alignItems: 'center', mb: 1}}>
                            <VolumeDown/>
                            <Slider
                                aria-label="Volume"
                                value={volumeValue}
                                onChange={handleVolumeChange}
                                valueLabelDisplay="auto"
                                min={0}
                                max={100}
                            />
                            <VolumeUp/>
                        </Stack>
                    </Box>
                </MenuItem>
            </Menu>
            {isDesktop ? (
                /* Render permanent variant for DESKTOP */
                <Drawer variant="permanent" open={drawerOpen}>
                    {drawerContent}
                </Drawer>
            ) : (
                /* Render temporary variant for MOBILE and TABLET */
                <MuiDrawer variant="temporary" open={drawerOpen} onClose={handleDrawerClose}
                    sx={{
                        '& .MuiDrawer-paper': {
                        width: drawerWidthMobile,
                        },
                    }}
                >
                    {drawerContent}
                </MuiDrawer>
            )}

            <Box sx={{display: "none"}}>
                <AlarmAudio/>
            </Box>
            <Box
                component="main"
                sx={(theme) => {
                    // On desktop, shrink by drawerWidth if open
                    const desktopWidth = drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%';
                    return {
                        height: '100%',
                        width: {
                            xs: '100%',
                            lg: desktopWidth,
                        },
                        transition: theme.transitions.create(['margin-left', 'width'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.standard,
                        }),
                    };
                }}
            >
                <DrawerHeader/>
                <Box m={2} mr={0}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
