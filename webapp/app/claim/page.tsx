import type { Metadata } from "next";
import { Panel, PageHero, BtnEmber } from "../spirit/ui";
import { IconCollection } from "../spirit/icons";

export const metadata: Metadata = {
  title: "Packs — Spirit Cards",
  description:
    "Card packs are coming soon to Spirit Cards. Mining is live on Robinhood Chain.",
};

/**
 * /claim — repurposed from the old free-claims page. POC has no claim
 * codes; this route is a placeholder for the future "Packs" surface.
 */
export default function ClaimPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <PageHero
        kicker="Claim"
        title="Claim"
        image="/spirit/scene-elements.jpg"
        imageAlt="Spirit Cards packs — coming soon"
        icon={<IconCollection size={18} />}
        subtitle="Packs are coming soon. Mine, merge, stake and battle Spirit Cards collectibles on Robinhood Chain in the meantime."
      />

      <div className="mx-auto max-w-2xl">
        <Panel kicker="Packs — Coming Soon">
          <div className="flex items-start gap-4">
            <span className="mt-1 grid h-12 w-12 shrink-0 place-items-center border border-slate/70 bg-basalt text-gold">
              <IconCollection size={24} />
            </span>
            <div>
              <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-bone">
                Packs
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ash">
                Packs are not live yet. Mine, merge, stake and battle Spirit
                Cards collectibles on Robinhood Chain while we build them out.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <BtnEmber href="/mine">Start mining</BtnEmber>
          </div>
        </Panel>
      </div>
    </main>
  );
}
