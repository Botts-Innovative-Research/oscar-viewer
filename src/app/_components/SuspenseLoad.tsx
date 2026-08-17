import CircularProgress from "@mui/material/CircularProgress";
import {Container} from "@mui/material";

export default function SuspenseLoad({ fullPage = true }: { fullPage?: boolean }) {
    return (
        <Container
            sx={{
                display: 'flex',
                ...(fullPage && { minHeight: '100vh' }),
        }}
        >
            <CircularProgress/>
        </Container>
    )
}