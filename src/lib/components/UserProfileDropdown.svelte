<script lang="ts">
	import { page } from '$app/state';
	import IconCog from '~icons/mdi/cog';
	import IconAirplane from '~icons/mdi/airplane';
	import IconRating from '~icons/mdi/radar';
	import IconLogout from '~icons/mdi/logout';
	import IconAccount from '~icons/mdi/account-circle';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconBook from '~icons/mdi/book-open-variant';
	import IconTools from '~icons/mdi/tools';
	import type { User } from '$lib/db/schema/users';
	import MembershipBadge from './MembershipBadge.svelte';

	let { user, roles }: { user: User | undefined; roles: string[] | undefined } = $props();

	function getFullName(user: User): string {
		return user.preferredName
			? user.preferredName
			: `${user.firstName} ${user.lastName}`;
	}

	let showDropdown = $state(false);

	function toggle(event: Event) {
		event.stopPropagation();
		showDropdown = !showDropdown;
	}

	function closeDropdown() {
		showDropdown = false;
	}
</script>

<svelte:document
	onclick={(e: Event) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.user-dropdown')) {
			closeDropdown();
		}
	}}
/>

<div class="hidden md:block">
	{#if user}
		<div class="user-dropdown relative">
			<button
				type="button"
				onclick={toggle}
				aria-expanded={showDropdown}
				aria-haspopup="menu"
				aria-label="User menu"
				class="flex cursor-pointer items-center space-x-3 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out {showDropdown
					? 'rounded-t-lg rounded-b-none border border-b-0 border-slate-600/30 bg-sky-600/20 text-white'
					: 'rounded-lg text-gray-300 hover:bg-slate-700/50 hover:text-white'}"
			>
				<MembershipBadge size="sm" membership={user.membership} />
				<div class="flex items-center space-x-2">
					<span class="font-medium">{getFullName(user)}</span>
					<div class="flex items-center space-x-1">
						{#if user.data.vatsim.rating.short}
							<div
								class="flex items-center gap-1 rounded-md bg-sky-600/30 px-2 py-1 font-mono text-xs text-sky-200"
							>
								<IconRating class="h-3 w-3" />
								{user.data.vatsim.rating.short}
							</div>
						{/if}
						{#if user.data.vatsim.pilotrating.short}
							<div
								class="flex items-center gap-1 rounded-md bg-pink-600/30 px-2 py-1 font-mono text-xs text-pink-200"
							>
								<IconAirplane class="h-3 w-3" />
								{user.data.vatsim.pilotrating.short}
							</div>
						{/if}
					</div>
				</div>
				<IconChevronDown
					class="h-4 w-4 transition-transform duration-200 {showDropdown ? 'rotate-180' : ''}"
				/>
			</button>

			{#if showDropdown}
				<div
					role="menu"
					class="absolute top-full right-0 left-0 z-[9999] rounded-t-none rounded-b-lg border border-t-0 border-slate-600/30 bg-slate-800/95 shadow-xl backdrop-blur-lg"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					tabindex="-1"
				>
					<div class="p-3 space-y-1">
						<!-- Settings -->
						<a
							href="/settings"
							role="menuitem"
							onclick={closeDropdown}
							class="flex w-full cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors duration-200 hover:bg-slate-600/30 hover:text-white"
						>
							<IconCog class="h-4 w-4" />
							<span>Manage Settings</span>
						</a>

						<!-- Divider -->
						<div class="border-t border-slate-600/30 my-2"></div>

						<!-- Indy Library -->
						<a
							href="https://wiki.flyindycenter.com"
							target="_blank"
							rel="noopener noreferrer"
							role="menuitem"
							onclick={closeDropdown}
							class="flex w-full cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors duration-200 hover:bg-slate-600/30 hover:text-white"
						>
							<IconBook class="h-4 w-4" />
							<span>Indy Library</span>
						</a>

						<!-- Controller Tools -->
						<a
							href="https://tools.flyindycenter.com"
							target="_blank"
							rel="noopener noreferrer"
							role="menuitem"
							onclick={closeDropdown}
							class="flex w-full cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors duration-200 hover:bg-slate-600/30 hover:text-white"
						>
							<IconTools class="h-4 w-4" />
							<span>Controller Tools</span>
						</a>

						<!-- Divider -->
						<div class="border-t border-slate-600/30 my-2"></div>

						<!-- Sign Out -->
						<a
							href="/logout"
							role="menuitem"
							onclick={closeDropdown}
							class="flex w-full cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors duration-200 hover:bg-red-600/20 hover:text-red-200"
						>
							<IconLogout class="h-4 w-4" />
							<span>Sign Out</span>
						</a>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Login Button for non-authenticated users -->
		<a
			href={`/login/connect?returnUrl=${encodeURIComponent(page.url.pathname)}`}
			class="flex cursor-pointer items-center space-x-1.5 rounded-md bg-sky-400/30 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-sky-500/40 hover:text-gray-100"
		>
			<IconAccount class="h-5 w-5" />
			<span>Connect VATSIM Account</span>
		</a>
	{/if}
</div>