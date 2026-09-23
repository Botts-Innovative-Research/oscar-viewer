import {generateAdjudicationCommandJSON} from "../../src/lib/data/oscar/OSCARCommands";

describe("adjudication command", () => {
    it("includes the vehicle ID entered during dashboard adjudication", () => {
        const command = generateAdjudicationCommandJSON(
            "inspection complete",
            {code: 9, label: "Authorized activity", group: "Test/Maintenance"} as any,
            [],
            "NONE",
            [],
            "occupancy-observation-1",
            "TRUCK-204",
        );

        expect(JSON.parse(command).parameters.vehicleId).to.equal("TRUCK-204");
    });
});
