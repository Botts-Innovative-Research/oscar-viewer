"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {createContext, useContext} from "react";

/**
 * The app bar exposes a slot that pages render their toolbar into, so the page
 * title and edit controls share the header row instead of costing a second row
 * below it.
 *
 * Navbar owns the slot element and publishes it here; PageToolbar portals into
 * it. Going through a portal (rather than having Navbar resolve the active page
 * from the route) keeps route→pageId knowledge in the page components, which is
 * what makes `/custom-page/?id=` and lane-view's `leading` prop keep working.
 *
 * The value is null on the very first render, before Navbar's ref callback has
 * run; consumers render nothing until it is set.
 */
const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function HeaderSlotProvider({node, children}: { node: HTMLElement | null, children: React.ReactNode }) {
    return <HeaderSlotContext.Provider value={node}>{children}</HeaderSlotContext.Provider>;
}

export function useHeaderSlot(): HTMLElement | null {
    return useContext(HeaderSlotContext);
}
