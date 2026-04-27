import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { WagmiProvider } from "wagmi";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { initAppKit } from "../lib/appkit";
import { TRPCProvider, trpcClient } from "../lib/trpc";
import { wagmiConfig } from "../lib/wagmi";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Pactly — Stake to meet" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		initAppKit();
	}, []);
	const { queryClient } = Route.useRouteContext();
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<WagmiProvider config={wagmiConfig}>
					<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
						{children}
					</TRPCProvider>
				</WagmiProvider>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
