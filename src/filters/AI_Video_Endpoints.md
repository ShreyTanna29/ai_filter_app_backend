# AI Video Generation API

This API provides a large set of POST endpoints for generating short AI-powered videos from a single image and a descriptive prompt, using Fal AI's image-to-video models. Each endpoint corresponds to a unique theme or transformation.

---

## Base URL

```
/api/ai-<feature>
```

Replace `<feature>` with the desired endpoint key (see [Available Endpoints](#available-endpoints) below).

---

## Authentication

**Header:**  
`FAL_KEY` must be set in your backend environment.  
No authentication is required for clients by default.

---

## Request

**Method:**  
`POST`

**Content-Type:**  
`multipart/form-data`

**Body Parameters:**

| Field  | Type   | Required | Description                                 |
| ------ | ------ | -------- | ------------------------------------------- |
| image  | file   | Yes      | The input image (JPG, PNG, etc.)            |
| prompt | string | No       | Custom prompt (overrides default, optional) |

---

## Response

- **Success:**  
  `200 OK`  
  JSON object containing the Fal AI model output (usually includes a video URL and metadata).

- **Error:**  
  `4xx` or `5xx`  
  JSON object with `error` and possibly `details`.

---

## Example Request (cURL)

```bash
curl -X POST https://yourdomain.com/api/ai-dance \
  -F "image=@/path/to/your/image.jpg"
```

**With custom prompt:**

```bash
curl -X POST https://yourdomain.com/api/ai-dance \
  -F "image=@/path/to/your/image.jpg" \
  -F "prompt=an astronaut dancing on the moon, cinematic lighting"
```

---

## Available Endpoints

Below is a list of all available endpoints and their default prompts.  
**To use an endpoint, POST to `/api/<endpoint>` with an image.**

| Endpoint            | Default Prompt                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ai-dance            | a person dancing                                                                                                         |
| ai-bikini           | a woman posing in a bikini                                                                                               |
| ai-twerk            | a person twerking                                                                                                        |
| ai-mermaid          | a mermaid swimming in the ocean                                                                                          |
| ai-kiss             | two people kissing                                                                                                       |
| ai-harley           | a woman dressed as Harley Quinn                                                                                          |
| ai-waka-waka        | a person dancing waka waka                                                                                               |
| ai-sexy-bride       | a sexy bride in a wedding dress                                                                                          |
| ai-angel-bikini     | a woman in an angel bikini costume                                                                                       |
| ai-wonder           | a woman dressed as Wonder Woman                                                                                          |
| ai-babydoll         | a woman in a babydoll dress                                                                                              |
| ai-beach            | a person at the beach                                                                                                    |
| ai-aeon-flux        | a woman as Aeon Flux, futuristic style                                                                                   |
| ai-quinn            | a woman dressed as Harley Quinn, playful pose                                                                            |
| ai-mystery          | a mysterious person in a dark, cinematic scene                                                                           |
| ai-lara             | a woman dressed as Lara Croft, action pose                                                                               |
| ai-cyber            | a person in a cyberpunk outfit, neon lights                                                                              |
| ai-gold-bikini      | a woman in a gold bikini, glamorous pose                                                                                 |
| ai-dragon-queen     | a woman as a dragon queen, fantasy style                                                                                 |
| ai-leia             | a woman dressed as Princess Leia, sci-fi scene                                                                           |
| ai-belly-dance      | a woman performing a belly dance                                                                                         |
| ai-swing            | a person swinging on a swing                                                                                             |
| ai-pole             | a person performing a pole dance                                                                                         |
| ai-groove           | a person grooving to music                                                                                               |
| ai-party            | a person at a party, dancing                                                                                             |
| ai-bedtime          | a person in bedtime attire, relaxing                                                                                     |
| ai-she-tries        | a woman trying something new, playful scene                                                                              |
| ai-wedding          | a person at a wedding, in a wedding dress                                                                                |
| ai-he-tries         | a man trying something new, playful scene                                                                                |
| ai-hug              | two people hugging                                                                                                       |
| ai-proposal         | a marriage proposal scene                                                                                                |
| ai-cheers           | a group of people cheering with drinks                                                                                   |
| ai-dance-together   | people dancing together                                                                                                  |
| ai-fight            | two people in a dramatic fight scene                                                                                     |
| ai-exotic-bikini    | a woman in an exotic bikini                                                                                              |
| ai-polka-bikini     | a woman in a polka dot bikini                                                                                            |
| ai-green-bikini     | a woman in a green bikini                                                                                                |
| ai-speedo           | a man in a speedo at the beach                                                                                           |
| ai-diamond-bikini   | a woman in a diamond-studded bikini                                                                                      |
| ai-swim-trunk       | a man in swim trunks at the pool                                                                                         |
| ai-swim-shorts      | a man in swim shorts at the beach                                                                                        |
| ai-chocofall        | a person with liquid chocolate falling on her                                                                            |
| ai-waterfall        | a person under a waterfall                                                                                               |
| ai-milkfall         | a person with milk falling on her                                                                                        |
| ai-honeyfall        | a person with honey falling on her                                                                                       |
| ai-winefall         | a person with wine falling on her                                                                                        |
| ai-beerfall         | a person with beer falling on her                                                                                        |
| ai-black-lingerie   | a woman in black lingerie                                                                                                |
| ai-red-nightdress   | a woman in a red nightdress                                                                                              |
| ai-red-lingerie     | a woman in red lingerie                                                                                                  |
| ai-black-nightdress | a woman in a black nightdress                                                                                            |
| ai-red-latex        | a woman in red latex outfit                                                                                              |
| ai-black-latex      | a woman in black latex outfit                                                                                            |
| ai-groom            | a man in a groom's suit                                                                                                  |
| ai-classic-bride    | a woman in a classic bridal gown                                                                                         |
| ai-chic-bride       | a woman in a chic bridal dress                                                                                           |
| ai-night-out-dress  | a woman in a night out dress                                                                                             |
| ai-smart-casual     | a woman in smart casual attire                                                                                           |
| ai-arabica-hijab    | a woman in an arabic hijab                                                                                               |
| ai-party-dog        | a dog at a party                                                                                                         |
| ai-super-dog        | a dog in a superhero costume                                                                                             |
| ai-barbie-dog       | a dog in a barbie outfit                                                                                                 |
| ai-chef-dog         | a dog in a chef's outfit                                                                                                 |
| ai-tuxedo-dog       | a dog in a tuxedo                                                                                                        |
| ai-dog-cop          | a dog in a police uniform                                                                                                |
| ai-bride-dog        | a dog in a bridal dress                                                                                                  |
| ai-pop-star-dog     | a dog as a pop star                                                                                                      |
| ai-dancing-dog      | a dog dancing                                                                                                            |
| ai-chef-cat         | a cat wearing a chef's outfit                                                                                            |
| ai-bride-cat        | a cat in a bridal dress                                                                                                  |
| ai-super-cat        | a cat in a superhero costume                                                                                             |
| ai-party-cat        | a cat at a party                                                                                                         |
| ai-cat-cop          | a cat in a police uniform                                                                                                |
| ai-tuxedo-cat       | a cat in a tuxedo                                                                                                        |
| ai-barbie-cat       | a cat in a barbie outfit                                                                                                 |
| ai-starlight        | a person in a starlight fantasy scene                                                                                    |
| ai-zeus             | a man as Zeus, god of thunder                                                                                            |
| ai-raeya            | a woman as Raeya, fantasy queen                                                                                          |
| ai-sunlord          | a man as the Sunlord, radiant and powerful                                                                               |
| ai-empress          | a woman as an empress, regal and majestic                                                                                |
| ai-athena           | a woman as Athena, goddess of wisdom                                                                                     |
| ai-ra               | a man as Ra, Egyptian sun god                                                                                            |
| ai-king             | a man as a king, royal attire                                                                                            |
| ai-queen            | a woman as a queen, royal attire                                                                                         |
| ai-sultana          | a woman as a sultana, luxurious attire                                                                                   |
| ai-sultan           | a man as a sultan, luxurious attire                                                                                      |
| ai-emperor          | a man as an emperor, imperial attire                                                                                     |
| ai-crown            | a person wearing a crown                                                                                                 |
| ai-jester           | a person as a court jester                                                                                               |
| ai-super            | a person in a superhero costume                                                                                          |
| ai-powerup          | a person powering up, energy effects                                                                                     |
| ai-hulk             | a person as the Hulk, muscular and green                                                                                 |
| ai-aquaman          | a person as Aquaman, underwater scene                                                                                    |
| ai-man-of-iron      | a person as Iron Man, armored suit                                                                                       |
| ai-venom            | a person as Venom, symbiote effects                                                                                      |
| ai-dark-knight      | a person as the Dark Knight, vigilante                                                                                   |
| ai-ex-machina       | a person as a cyborg, ex machina style                                                                                   |
| ai-beast            | a person as a beast, wild and powerful                                                                                   |
| ai-fire-skill       | a person with fire powers, dramatic effects                                                                              |
| ai-mecha-man        | a person as a mecha robot                                                                                                |
| ai-zombie           | a person as a zombie, horror style                                                                                       |
| ai-goldy            | a person as a cartoon goldy character, vibrant colors                                                                    |
| ai-ariel            | a person as a mermaid like Ariel, underwater fantasy style                                                               |
| ai-cinderella       | a person as Cinderella in a magical setting                                                                              |
| ai-frozen-queen     | a person as an ice queen like Frozen, snow and frost effects                                                             |
| ai-doll             | a person transformed into a doll, plastic skin, large eyes                                                               |
| ai-rapunzel         | a person with long flowing hair like Rapunzel, fairy tale style                                                          |
| ai-busty            | a woman with exaggerated curves — large breasts, thick thighs, and prominent buttocks, glamour-style with confident pose |
| ai-muscle-up        | a person transformed into a muscular bodybuilder                                                                         |
| ai-plus-man         | a man with plus-size transformation, realistic style                                                                     |
| ai-plus-girl        | a woman with plus-size transformation, realistic style                                                                   |
| ai-pregnant         | a person with visible pregnancy belly, peaceful background                                                               |
| ai-tattoed          | a person with full body tattoos, bold and edgy look                                                                      |
| ai-aged-look        | a person aged into elderly, wise and realistic wrinkles                                                                  |
| ai-aged-male        | a male person aged realistically, elderly style                                                                          |
| ai-mini-me          | a small-sized version of the person, toy-like proportions                                                                |
| ai-french-maid      | a person in a French maid outfit, vintage house background                                                               |
| ai-nurse            | a person dressed as a nurse, hospital setting                                                                            |
| ai-fireman          | a person in a fireman uniform, dramatic fire background                                                                  |
| ai-police-woman     | a woman dressed as a police officer                                                                                      |
| ai-cowboy           | a person as a cowboy in wild west setting                                                                                |
| ai-police-man       | a man in a police uniform, urban background                                                                              |
| ai-cowgirl          | a woman as a cowgirl, western theme                                                                                      |
| ai-ring-girl        | a person as a boxing ring girl, spotlight setting                                                                        |
| ai-he-builder       | a man in builder uniform, construction site                                                                              |
| ai-warrior          | a person as a medieval warrior, battlefield background                                                                   |
| ai-rancher          | a person as a rancher, farm or countryside backdrop                                                                      |
| ai-she-builder      | a woman as a construction worker, high-visibility vest                                                                   |
| ai-barn-beauty      | a person styled as a country barn beauty, rustic setting                                                                 |
| ai-ballerina        | a person in a ballerina outfit, stage or dance studio                                                                    |
| ai-soldier          | a person in soldier uniform, battlefield or army camp                                                                    |
| ai-katana-girl      | a girl with a katana sword, anime samurai vibe                                                                           |
| ai-cheerleader      | a person dressed as a cheerleader, energetic pose                                                                        |
| ai-boxer            | a person as a boxer in a boxing ring                                                                                     |
| ai-idol-kiss        | a person receiving a kiss from an idol, romantic spotlight                                                               |
| ai-blonde-kiss      | a person getting kissed by a blonde character                                                                            |
| ai-fantasy-kiss     | a magical kiss scene in a fantasy setting                                                                                |
| ai-desi-kiss        | a traditional desi kiss, vibrant Indian background                                                                       |
| ai-diva-kiss        | a person getting kissed by a glamorous diva                                                                              |
| ai-bikini-kiss      | a beach kiss scene with bikini characters                                                                                |
| ai-muscle-kiss      | a muscular character giving a dramatic kiss                                                                              |
| ai-flirt            | a person in a flirty pose with playful expression                                                                        |
| ai-spin             | a person spinning gracefully, motion blur effect                                                                         |
| ai-fashion-walk     | a person walking on a fashion runway                                                                                     |
| ai-rose             | a person holding a rose, romantic theme                                                                                  |
| ai-smile            | a smiling person, natural and joyful                                                                                     |
| ai-running-slow-mo  | a person running in slow motion, dramatic wind                                                                           |
| ai-celebrate        | a person celebrating with confetti and excitement                                                                        |
| ai-wave             | a person waving hello, friendly gesture                                                                                  |
| ai-peace            | a person showing peace sign, casual expression                                                                           |
| ai-hand-heart       | a person making a heart shape with hands                                                                                 |
| ai-sing             | a person singing with mic, spotlight scene                                                                               |
| ai-shout            | a person shouting, high energy and emotion                                                                               |
| ai-cry              | a person crying, emotional expression                                                                                    |
| ai-speak            | a person talking, expressive mouth and eyes                                                                              |
| ai-banana           | a person eating a banana, fun and casual                                                                                 |
| ai-posicle          | a person licking a popsicle, summer theme                                                                                |
| ai-puro             | a person drinking from a puro (traditional look)                                                                         |
| ai-wine             | a person sipping wine, classy background                                                                                 |
| ai-ice-cream        | a person enjoying ice cream, playful and cute                                                                            |
| ai-beer             | a person holding or drinking beer, festive mood                                                                          |
| ai-smoke            | a person smoking, cinematic dark tone                                                                                    |
| ai-money            | a person surrounded by flying money, luxury theme                                                                        |
| ai-float-up         | a person floating upward, gravity-defying effect                                                                         |
| ai-burn             | a person on fire, dramatic and powerful flames                                                                           |
| ai-falling-baby     | a surreal scene of baby falling gently, dreamlike                                                                        |
| ai-rabbit-ears      | a person with cute rabbit ears, playful style                                                                            |
| ai-live-photo       | a still portrait animated with subtle head movement, blinking eyes, gentle smile, and smooth looping motion              |

---

## Error Codes

- `400 Bad Request`: Image file missing or invalid.
- `422 Unprocessable Entity`: Input validation failed (e.g., bad prompt, image upload failed).
- `500 Internal Server Error`: Unexpected server or model error.

---

## Notes

- You can override the default prompt by sending a `prompt` field in your form data.
- The output will include a video URL and possibly other metadata from Fal AI.
- All endpoints require an image upload as `image` in the form data.

---

## Example Response

```json
{
  "video": {
    "url": "https://v3.fal.media/files/zebra/1aHBYwr26yydd2AG24N48_video.mp4",
    "content_type": "video/mp4",
    "file_name": "video.mp4",
    "file_size": 4100379
  },
  "seed": 142263008
}
```

---

## Contact

For support or to request new features, contact the API maintainer.
