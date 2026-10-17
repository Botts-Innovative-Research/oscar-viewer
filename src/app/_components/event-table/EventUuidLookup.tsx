"use client";

import React, {FormEvent, useContext, useState} from "react";
import {Button, Stack, TextField} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {useRouter} from "next/navigation";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {
    buildEventDetailsHref,
    EventLookupError,
    normalizeEventObservationId,
} from "@/lib/data/oscar/EventLookup";

export default function EventUuidLookup() {
    const router = useRouter();
    const {scopedHref} = useContext(DataSourceContext);
    const {t} = useLanguage();
    const [value, setValue] = useState("");
    const [error, setError] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        try {
            const eventId = normalizeEventObservationId(value);
            setError(false);
            router.push(scopedHref(buildEventDetailsHref(eventId)));
        } catch (reason) {
            if (reason instanceof EventLookupError) setError(true);
            else throw reason;
        }
    };

    return (
        <Stack
            component="form"
            onSubmit={submit}
            direction={{xs: "column", sm: "row"}}
            spacing={1}
            alignItems={{sm: "flex-start"}}
            sx={{width: {xs: "100%", md: "auto"}}}
        >
            <TextField
                data-testid="event-uuid-search-input"
                size="small"
                label={t("occupancyUuid")}
                value={value}
                onChange={event => {
                    setValue(event.target.value);
                    if (error) setError(false);
                }}
                error={error}
                helperText={error ? t("occupancyUuidInvalid") : t("occupancyUuidSearchHelp")}
                inputProps={{maxLength: 128}}
                sx={{minWidth: {sm: 360}}}
            />
            <Button
                data-testid="event-uuid-search-submit"
                type="submit"
                variant="contained"
                startIcon={<SearchRoundedIcon/>}
                sx={{whiteSpace: "nowrap"}}
            >
                {t("findEventByUuid")}
            </Button>
        </Stack>
    );
}
