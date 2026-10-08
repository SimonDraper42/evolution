# Evolution

A browser game exploring natural selection in a shared ecosystem. Create herbivores and carnivores with different speed, sensing distance, and body size. Herbivores graze and herd; carnivores hunt herbivores and may eat smaller carnivores when no eligible herbivore is within sight. Well-fed creatures reproduce with small inherited mutations.

## Run

Requires Python 3 for the local static server. No packages or build step are required.

```sh
cd /workspace/evolution
python3 -m http.server 8000 --bind 0.0.0.0
```

Open the served application in a browser. Click the landscape to place one creature, or use **Add 5 creatures**. New worlds and added groups contain both small and large creatures of each type. The body size slider sets a typical group size, with a spread of up to three size units on either side within the 4–12 limits. Clicking the landscape places one creature at the exact selected size. Pause, change simulation speed, or start a new world from the toolbar.

## Validate

Requires Node.js 18 or newer.

```sh
node --test simulation.test.mjs
```

This is a simplified educational model rather than a scientific simulation. Movement and sensing have energy costs, body size controls herbivore predation and favors larger carnivores in fights, green food regrows, and creatures die from hunger or old age. Movement speed gradually falls from 100% at birth to 25% at the end of an 18-day lifespan (180 simulation seconds). Aging does not alter the base speed trait passed to offspring. Offspring inherit mutated traits; changes in population averages can also reflect creatures you manually add. The world supports up to 250 creatures and 300 food patches to keep browser performance manageable. There is no account system or persistence yet.

Hunger increases as energy falls below 65. Hungrier carnivores are more likely to enter two-second aggressive chases, moving up to 40% faster with increased movement energy costs. Hungry herbivores are more likely to make 1.5-second mistakes: turning off course and ignoring herd and predator cues. Feeding reduces hunger and the chance of new events. Orange rings indicate hunger. Age still reduces chase speed, and herbivore prey size limits remain in effect.

Carnivores prefer edible herbivores, then smaller rivals. During aggression, they occasionally risk attacking equal or larger rivals, with willingness falling sharply as the size gap grows and rising with hunger. Decisions are sampled once per simulation second; risky fights can kill the attacker.

Herbivores gain survival skill after a predator is detected for at least one second and then leaves their detection range. Skill increases danger detection range (up to 30%), herd cohesion, and resistance to hunger mistakes (up to 80%). Offspring receive 75% of parental skill. This is a simplified model of parental teaching, not genetic inheritance of acquired knowledge. The interface shows living herbivores’ average skill.
