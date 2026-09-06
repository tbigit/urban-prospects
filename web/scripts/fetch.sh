set -e
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
SLUGS="understanding-nsw-zoning-overlays-and-their-impact-on-development-potential
how-to-identify-high-potential-infill-sites-in-nsw
how-interest-rate-movements-are-reshaping-buyer-behaviour-in-2026
how-to-analyse-a-site-for-feasibility-in-10-minutes
transit-oriented-development-nsws-next-growth-corridors
nsw-planning-in-2026-what-developers-need-to-know
mastering-off-market-site-acquisition-strategies-that-work-in-nsw
the-role-of-local-demographics-in-choosing-the-right-site-for-development
minimising-risk-how-smart-site-selection-tools-are-shaping-the-future-of-development
climate-resilience-in-urban-planning-preparing-for-the-future
the-hidden-costs-of-property-development-what-to-watch-out-for
the-influence-of-cultural-heritage-on-urban-development-projects
emerging-trends-in-urban-design-for-sustainable-living
the-role-of-public-transport-in-shaping-property-values
the-future-of-urban-development-trends-to-watch-in-2025
navigating-local-government-regulations-for-property-development-in-australia
using-data-to-unlock-hidden-opportunities-in-site-selection
the-benefits-of-early-site-assessment-in-development-projects
sustainable-development-balancing-growth-and-environmental-responsibility
the-role-of-technology-in-modern-urban-planning
the-impact-of-infrastructure-on-property-development
maximising-roi-tips-for-choosing-the-right-development-site-in-new-south-wales
nsw-regions
development-land-for-sale-northern-nsw
development-land-for-sale-southern-nsw
land-for-sale-in-the-central-coast
land-for-sale-western-nsw
residential-development-sites-for-sale-in-sydney
blog"
for s in $SLUGS; do
  if [ ! -s "live/$s.html" ]; then
    curl -sL --max-time 90 -A "$UA" "https://www.urbanprospects.com.au/$s/" -o "live/$s.html"
    printf "%-70s %s\n" "$s" "$(wc -c < live/$s.html)"
    sleep 0.4
  fi
done
